import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
   * 2-level hierarchy: PROVINCE → DISTRICT
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
      // Province scope: include province + all child districts
      const districts = await this.areaRepo.find({
        where: { parentId: areaId },
      });
      areaIds.push(...districts.map((d) => d.id));
    }
    // DISTRICT scope: just the district itself

    return areaIds;
  }

  async findById(id: string): Promise<Area | null> {
    return this.areaRepo.findOneBy({ id });
  }
}
