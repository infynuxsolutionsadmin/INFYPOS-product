import { IsOptional, IsUrl } from 'class-validator';

export class CreatePortalSessionDto {
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'returnUrl must be a valid URL' })
  returnUrl?: string;
}
