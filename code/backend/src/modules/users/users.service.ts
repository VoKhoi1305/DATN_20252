import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateUser(id: string, partial: Partial<User>): Promise<void> {
    await this.userRepository.update(id, partial);
  }

  async incrementFailedLogin(id: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return 0;
    }
    const newCount = user.failedLoginCount + 1;
    await this.userRepository.update(id, { failedLoginCount: newCount });
    return newCount;
  }

  async resetFailedLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      failedLoginCount: 0,
      lockedUntil: null,
    });
  }

  async lockUser(id: string, until: Date): Promise<void> {
    await this.userRepository.update(id, {
      lockedUntil: until,
    });
  }
}
