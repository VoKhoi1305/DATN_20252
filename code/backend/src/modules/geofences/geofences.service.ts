import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Geofence, GeofenceType } from './entities/geofence.entity';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { ListGeofencesDto } from './dto/list-geofences.dto';

@Injectable()
export class GeofencesService {
  constructor(
    @InjectRepository(Geofence)
    private readonly geofenceRepo: Repository<Geofence>,
  ) {}

  async findAll(dto: ListGeofencesDto, userId: string) {
    const page = Math.max(1, parseInt(dto.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(dto.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const qb = this.geofenceRepo.createQueryBuilder('g');

    if (dto.search) {
      qb.andWhere('(g.name ILIKE :s OR g.code ILIKE :s OR g.address ILIKE :s)', {
        s: `%${dto.search}%`,
      });
    }

    if (dto.is_active !== undefined && dto.is_active !== '') {
      qb.andWhere('g.is_active = :active', { active: dto.is_active === 'true' });
    }

    qb.orderBy('g.created_at', 'DESC');

    const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      data: data.map((g) => this.toResponse(g)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string) {
    const geofence = await this.geofenceRepo.findOneBy({ id });
    if (!geofence) throw new NotFoundException('Geofence not found');
    return this.toResponse(geofence);
  }

  async create(dto: CreateGeofenceDto, userId: string) {
    const code = await this.generateCode();

    const geofence = this.geofenceRepo.create({
      code,
      name: dto.name,
      type: GeofenceType.CIRCLE,
      address: dto.address,
      centerLat: dto.center_lat,
      centerLng: dto.center_lng,
      radius: dto.radius,
      areaId: null,
      createdById: userId,
    });

    const saved = await this.geofenceRepo.save(geofence);
    return this.toResponse(saved);
  }

  async update(id: string, dto: UpdateGeofenceDto, userId: string) {
    const geofence = await this.geofenceRepo.findOneBy({ id });
    if (!geofence) throw new NotFoundException('Geofence not found');

    if (dto.name !== undefined) geofence.name = dto.name;
    if (dto.address !== undefined) geofence.address = dto.address;
    if (dto.center_lat !== undefined) geofence.centerLat = dto.center_lat;
    if (dto.center_lng !== undefined) geofence.centerLng = dto.center_lng;
    if (dto.radius !== undefined) geofence.radius = dto.radius;
    if (dto.area_id !== undefined) geofence.areaId = dto.area_id;
    if (dto.is_active !== undefined) geofence.isActive = dto.is_active;

    const saved = await this.geofenceRepo.save(geofence);
    return this.toResponse(saved);
  }

  async remove(id: string) {
    const geofence = await this.geofenceRepo.findOneBy({ id });
    if (!geofence) throw new NotFoundException('Geofence not found');
    await this.geofenceRepo.softRemove(geofence);
    return { success: true };
  }

  /**
   * Geocode an address using OpenStreetMap Nominatim.
   */
  async geocode(address: string): Promise<{ lat: number; lng: number; display_name: string } | null> {
    if (!address || address.trim().length < 3) {
      throw new BadRequestException('Address too short');
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=vn`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SMTTS/1.0 (graduation-thesis)',
        'Accept-Language': 'vi,en',
      },
    });

    if (!res.ok) return null;

    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!results.length) return null;

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      display_name: results[0].display_name,
    };
  }

  /**
   * Geocode with multiple results for user selection.
   */
  async geocodeSearch(address: string) {
    if (!address || address.trim().length < 3) {
      throw new BadRequestException('Address too short');
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=vn`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SMTTS/1.0 (graduation-thesis)',
        'Accept-Language': 'vi,en',
      },
    });

    if (!res.ok) return [];

    const results = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      type: string;
    }>;

    return results.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      display_name: r.display_name,
      type: r.type,
    }));
  }

  /**
   * Haversine distance between two coordinates (in meters).
   */
  static haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Check if a point is within a geofence.
   */
  async checkPoint(
    geofenceId: string,
    lat: number,
    lng: number,
  ): Promise<{ inGeofence: boolean; distance: number }> {
    const geofence = await this.geofenceRepo.findOneBy({ id: geofenceId });
    if (!geofence) throw new NotFoundException('Geofence not found');

    if (geofence.centerLat == null || geofence.centerLng == null || geofence.radius == null) {
      throw new BadRequestException('Geofence has no center or radius configured');
    }

    const distance = GeofencesService.haversineDistance(
      Number(geofence.centerLat),
      Number(geofence.centerLng),
      lat,
      lng,
    );

    return {
      inGeofence: distance <= geofence.radius,
      distance: Math.round(distance),
    };
  }

  private async generateCode(): Promise<string> {
    const count = await this.geofenceRepo.count({ withDeleted: true });
    return `GF-${String(count + 1).padStart(5, '0')}`;
  }

  private toResponse(g: Geofence) {
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      address: g.address,
      center_lat: Number(g.centerLat),
      center_lng: Number(g.centerLng),
      radius: g.radius,
      area_id: g.areaId,
      is_active: g.isActive,
      created_by_id: g.createdById,
      created_at: g.createdAt,
      updated_at: g.updatedAt,
    };
  }
}
