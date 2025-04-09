import { LikeButton } from './like-button';
import { MessageCircle } from 'lucide-react';

type TripFooterProps = {
  tripId: string;
  userId: string;
  createdAt: string;
  likes: number;
  comments: number;
  onCommentsClick?: () => void;
};

export function TripFooter({ tripId, userId, createdAt, likes, comments, onCommentsClick }: TripFooterProps) {
  return (
    <div className="flex justify-between items-center px-4 py-2 text-sm text-gray-500">
      <div className="flex items-center space-x-4">
        <LikeButton tripId={tripId} initialCount={likes} userId={userId} />
        <button
          onClick={onCommentsClick}
          className="flex items-center text-gray-600"
        >
          <MessageCircle className="w-5 h-5 mr-1" />
          {comments}
        </button>
      </div>

      <div className="text-xs text-gray-400">
        by Test User • {new Date(createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}