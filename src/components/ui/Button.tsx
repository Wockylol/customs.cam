import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'outline' | 'ghost';
	size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
	variant = 'primary',
	size = 'md',
	className = '',
	children,
	...props
}) => {
	const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
	const sizes: Record<string, string> = {
		sm: 'text-sm px-3 py-1.5',
		md: 'text-sm px-4 py-2',
		lg: 'text-base px-5 py-3'
	};
	const variants: Record<string, string> = {
		primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700',
		outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:ring-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700',
		ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-800'
	};

	return (
		<button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
			{children}
		</button>
	);
}; 