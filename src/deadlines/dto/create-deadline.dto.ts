import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateDeadlineDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsNotEmpty()
  @IsDateString()
  dueDate: string

  @IsOptional()
  @IsString()
  description?: string
}
