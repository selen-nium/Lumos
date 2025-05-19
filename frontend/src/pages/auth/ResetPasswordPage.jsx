import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../supabaseClient';
import Logo from '../../components/common/Logo';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const ResetPasswordPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Check for access token and type in URL
  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Parse the URL for hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        // If this is a recovery flow and we have the token
        if (type === 'recovery' && accessToken) {
          // Set the session using the access and refresh tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            throw error;
          }
          
          if (data?.user?.email) {
            setEmail(data.user.email);
          }
        } else {
          // Check existing session as fallback
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user?.email) {
            setEmail(data.session.user.email);
          } else if (!accessToken) {
            setError('Invalid or expired reset link. Please request a new password reset.');
          }
        }
      } catch (error) {
        console.error('Error processing reset link:', error);
        setError('Error processing reset link. Please request a new password reset.');
      }
    };

    handlePasswordReset();
  }, [location]);

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please confirm your password'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setError('');
      
      try {
        const { error } = await supabase.auth.updateUser({ 
          password: values.password 
        });
        
        if (error) throw error;
        
        setIsSuccess(true);
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        
      } catch (error) {
        console.error('Password reset error:', error);
        setError(error.message || 'Failed to reset password');
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
      
      {/* Right side - Reset Password form */}
      <div className="w-1/2 flex justify-center items-center p-8">
        <div className="w-full max-w-md">
          {isSuccess ? (
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
              <h2 className="text-2xl font-medium text-text mb-2">Password Reset Successful</h2>
              <p className="text-gray-600 mb-6">
                Your password has been successfully reset. You will be redirected to the login page shortly.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-medium text-text mb-2 text-center">Reset Password</h2>
              <p className="text-gray-600 text-center mb-6">
                {email ? `Please enter a new password for ${email}` : 'Set your new password'}
              </p>
              
              {error ? (
                <div className="text-center space-y-4">
                  <div className="text-error text-xs">{error}</div>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => navigate('/forgot-password')}
                  >
                    Request New Reset Link
                  </Button>
                </div>
              ) : (
                <form onSubmit={formik.handleSubmit} className="space-y-6">
                  <div>
                    <Input
                      type="password"
                      name="password"
                      placeholder="New Password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.password && formik.errors.password}
                    />
                  </div>
                  
                  <div>
                    <Input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm New Password"
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.confirmPassword && formik.errors.confirmPassword}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Reset Password'}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;