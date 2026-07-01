/**
 * User management module for cinaauth SDK
 */

import { BaseClient } from '../base-client';
import {
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  RequestOptions
} from '../types';

export class UsersModule extends BaseClient {
  /**
   * Get current user's profile
   */
  async getProfile(options?: RequestOptions): Promise<UserProfile> {
    const response = await this.get<UserProfile>('/users/profile', options);
    return response.data;
  }

  /**
   * Update current user's profile
   */
  async updateProfile(request: UpdateProfileRequest, options?: RequestOptions): Promise<UserProfile> {
    const response = await this.put<UserProfile>('/users/profile', request, options);
    return response.data;
  }

  /**
   * Change current user's password
   */
  async changePassword(request: ChangePasswordRequest, options?: RequestOptions): Promise<void> {
    await this.post<void>('/users/change-password', request, options);
  }
}
