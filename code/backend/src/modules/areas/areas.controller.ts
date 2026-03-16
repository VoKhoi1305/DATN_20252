import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Area } from './entities/area.entity';
import { AreasService } from './areas.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('areas')
export class AreasController {
  constructor(
    private readonly areasService: AreasService,
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get()
  async findAll(@CurrentUser('userId') userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) return { data: [] };

    const areaIds = await this.areasService.resolveAreaIds(
      user.dataScopeLevel,
      user.areaId,
    );

    let areas: Area[];
    if (areaIds === null) {
      // SYSTEM scope — return all active areas
      areas = await this.areaRepo.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    } else if (areaIds.length === 0) {
      areas = [];
    } else {
      areas = await this.areaRepo
        .createQueryBuilder('a')
        .where('a.id IN (:...ids)', { ids: areaIds })
        .andWhere('a.is_active = true')
        .orderBy('a.name', 'ASC')
        .getMany();
    }

    return {
      data: areas.map((a) => ({
        id: a.id,
        name: a.name,
        level: a.level,
      })),
    };
  }
}
