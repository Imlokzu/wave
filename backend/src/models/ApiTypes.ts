/**
 * API Request and Response types
 */

// Room API types
export interface CreateRoomRequest {
  maxUsers?: number;
}

export interface CreateRoomResponse {
  roomId: string;
  code: string;
  inviteLink: string;
}

export interface JoinRoomRequest {
  nickname: string;
}

export interface JoinRoomResponse {
  success: boolean;
  participantId: string;
  room: {
    id: string;
    code: string;
    participantCount: number;
    maxUsers: number;
    isLocked: boolean;
  };
}

export interface RoomInfoResponse {
  id: string;
  code: string;
  participantCount: number;
  maxUsers: number;
  isLocked: boolean;
  createdAt: string;
}

// Message API types
export interface SendMessageRequest {
  content: string;
}

export interface ClearMessagesRequest {
  preserveSystem?: boolean;
}

export interface InjectFakeMessageRequest {
  content: string;
  spoofSource: string; // 'Google', 'Wikipedia', etc.
}

// Image API types
export interface UploadImageResponse {
  imageUrl: string;
  messageId: string;
}

// Error response
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
