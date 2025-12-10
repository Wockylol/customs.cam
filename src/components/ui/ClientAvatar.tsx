import React from 'react';
import { User } from 'lucide-react';

interface ClientAvatarProps {
  client: {
    username: string;
    avatar_url?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  lazy?: boolean; // Enable lazy loading for off-screen images
}

const ClientAvatar: React.FC<ClientAvatarProps> = ({ 
  client, 
  size = 'md', 
  className = '',
  lazy = true // Default to lazy loading for performance
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const getInitials = () => {
    return client.username.substring(0, 2).toUpperCase();
  };

  const getBackgroundColor = () => {
    // Generate consistent color based on username
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-green-500'
    ];
    
    const hash = client.username.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Show avatar if URL exists and no error occurred
  if (client.avatar_url && !imageError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative ${className}`}>
        {/* Loading placeholder with same color scheme as fallback */}
        {!imageLoaded && (
          <div className={`absolute inset-0 ${getBackgroundColor()} flex items-center justify-center text-white font-bold`}>
            {getInitials()}
          </div>
        )}
        <img
          src={client.avatar_url}
          alt={`@${client.username}`}
          className={`w-full h-full object-cover border-2 border-white shadow-sm transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
        />
      </div>
    );
  }

  // Fallback to initials
  return (
    <div className={`${sizeClasses[size]} ${getBackgroundColor()} rounded-full flex items-center justify-center text-white font-bold shadow-sm ${className}`}>
      {getInitials()}
    </div>
  );
};

export default ClientAvatar;