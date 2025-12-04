import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';

const AuthContainer: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  if (isSignUp) {
    return <SignUpForm onSwitchToLogin={() => setIsSignUp(false)} />;
  }

  return <LoginForm onSwitchToSignUp={() => setIsSignUp(true)} />;
};

export default AuthContainer;