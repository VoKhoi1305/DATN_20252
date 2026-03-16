import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { DataScopeLevel } from '../users/entities/user.entity';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
  ) {}

  /**
   * Resolve the set of area IDs visible to a user based on their scope level.
   * Returns null for SYSTEM scope (= no area filter needed).
   */
  async resolveAreaIds(
    scopeLevel: DataScopeLevel,
    areaId: string | null,
  ): Promise<string[] | null> {
    if (scopeLevel === DataScopeLevel.SYSTEM || !areaId) {
      return null;
    }

    const areaIds = [areaId];

    if (scopeLevel === DataScopeLevel.PROVINCE) {
      const districts = await this.areaRepo.find({
        where: { parentId: areaId },
      });
      const districtIds = districts.map((d) => d.id);
      areaIds.push(...districtIds);

      if (districtIds.length > 0) {
        const wards = await this.areaRepo.find({
          where: { parentId: In(districtIds) },
        });
        areaIds.push(...wards.map((w) => w.id));
      }
    } else if (scopeLevel === DataScopeLevel.DISTRICT) {
      const wards = await this.areaRepo.find({
        where: { parentId: areaId },
      });
      areaIds.push(...wards.map((w) => w.id));
    }

    return areaIds;
  }

  async findById(id: string): Promise<Area | null> {
    return this.areaRepo.findOneBy({ id });
  }
}
