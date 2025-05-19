import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../supabaseClient';
import Logo from '../../components/common/Logo';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ForgotPasswordPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setError('');
      
      try {
        // Use Supabase directly to send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) throw error;
        
        setIsSubmitted(true);
      } catch (error) {
        console.error('Password reset error:', error);
        setError(error.message || 'Failed to send reset link');
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-primary-light flex">
      {/* Left side - Logo */}
      <div className="w-1/2 flex justify-center items-center bg-primary-light">
          <Logo />
      </div>
      
      {/* Custom divider */}
      <div className="flex items-center">
        <div className="h-64 w-1 bg-divider rounded-full"></div>
      </div>
      
      {/* Right side - Forgot Password form */}
      <div className="w-1/2 flex justify-center items-center p-8">
        <div className="w-full max-w-md">
          {!isSubmitted ? (
            <>
              <h2 className="text-2xl font-medium text-text mb-2 text-center">Forgot Password</h2>
              <p className="text-gray-600 text-center mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <form onSubmit={formik.handleSubmit} className="space-y-6">
                <div>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.email && formik.errors.email}
                  />
                </div>

                {error && (
                  <div className="text-error text-xs text-center">{error}</div>
                )}
                
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                
                <div className="text-xs text-center">
                  <Link to="/login" className="text-btn-dark hover:underline">
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg 
                  className="w-16 h-16 text-success" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-medium text-text mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to {formik.values.email}
              </p>
              <div className="text-xs">
                <Link to="/login" className="text-btn-dark hover:underline">
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;