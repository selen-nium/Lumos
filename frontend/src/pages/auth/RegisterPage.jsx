import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../supabaseClient';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Logo from '../../components/common/Logo';

const RegisterPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  // Add a timer to redirect to login page after showing success message
  useEffect(() => {
    let timer;
    if (isSuccess) {
      timer = setTimeout(() => {
        navigate('/login');
      }, 5000); // 5 seconds delay before redirecting
    }
    return () => clearTimeout(timer);
  }, [isSuccess, navigate]);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Please confirm your password'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setError('');
      
      try {
        // Use Supabase directly instead of through AuthContext
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
          }
        });
        
        if (error) throw error;
        
        // Show success message
        setIsSuccess(true);
      } catch (error) {
        console.error('Registration error:', error);
        setError(error.message || 'Failed to register');
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleOAuthLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message || `Failed to sign up with ${provider}`);
    }
  };

  return (
    <div className="min-h-screen bg-primary-light flex">
      {/* Left side - Logo */}
      <div className="w-1/2 flex justify-center items-center bg-primary-light">
        <Logo />
      </div>
      
      {/* Custom divider */}
      <div className="flex items-center">
        <div className="h-180 w-0.5 bg-divider rounded-full"></div>
      </div>
      
      {/* Right side - Registration form */}
      <div className="w-1/2 flex justify-center items-center p-8">
        <div className="w-full max-w-md">
          {!isSuccess ? (
            <>
              <h2 className="text-2xl font-medium text-text mb-6 text-center">Create an Account</h2>
              
              <form onSubmit={formik.handleSubmit} className="space-y-5">
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
                
                <div>
                  <Input
                    type="password"
                    name="password"
                    placeholder="Password"
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
                    placeholder="Confirm Password"
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.confirmPassword && formik.errors.confirmPassword}
                  />
                </div>

                {error && (
                  <div className="text-error text-sm text-center">{error}</div>
                )}
                
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </Button>
                
                <div className="text-s text-center">
                  Already have an account?{' '}
                  <Link to="/login" className="text-btn-dark hover:underline">
                    Sign in
                  </Link>
                </div>
                
                <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-300 flex-grow"></div>
              <div className="bg-primary-light px-4 text-s text-gray-500 whitespace-nowrap">Or sign up with</div>
              <div className="border-t border-gray-300 flex-grow"></div>
            </div>
                
                <div className="flex flex-col space-y-4">
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => handleOAuthLogin('github')}
                  >
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                        />
                      </svg>
                      Github
                    </span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => handleOAuthLogin('google')}
                  >
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Google
                    </span>
                  </Button>
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
              <h2 className="text-2xl font-medium text-text mb-2">Registration Successful</h2>
              <p className="text-gray-600 mb-6">
                We have sent an authentication email to <span className="font-bold">{formik.values.email}</span>. 
                Please follow the steps in the email to confirm your sign up.
              </p>
              <p className="text-gray-500 mb-6">
                You will be redirected to the login page in a few seconds...
              </p>
              <div className="text-s">
                <Link to="/login" className="text-btn-dark hover:underline font-medium">
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

export default RegisterPage;