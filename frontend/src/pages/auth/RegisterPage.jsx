import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import Logo from '../../components/common/Logo';

const RegisterPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (isSuccess) {
      timer = setTimeout(() => {
        navigate('/login');
      }, 5000);
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
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
          }
        });
        
        if (error) throw error;
        
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
    <div className="min-h-screen bg-background flex">
      {/* Left side - Logo and branding */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-center items-center bg-muted/10 p-8">
        <div className="max-w-md text-center space-y-6">
          <Logo />
        </div>
      </div>
      
      {/* Right side - Registration form */}
      <div className="flex-1 lg:w-7/12 flex justify-center items-center p-8">
        <Card className="w-full max-w-md">
          {!isSuccess ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-semibold text-center">
                  Create Account
                </CardTitle>
                <CardDescription className="text-center">
                  Enter your details to get started
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={formik.touched.email && formik.errors.email ? 'border-destructive' : ''}
                    />
                    {formik.touched.email && formik.errors.email && (
                      <p className="text-sm text-destructive">{formik.errors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={formik.touched.password && formik.errors.password ? 'border-destructive' : ''}
                    />
                    {formik.touched.password && formik.errors.password && (
                      <p className="text-sm text-destructive">{formik.errors.password}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={formik.touched.confirmPassword && formik.errors.confirmPassword ? 'border-destructive' : ''}
                    />
                    {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                      <p className="text-sm text-destructive">{formik.errors.confirmPassword}</p>
                    )}
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
                
                <div className="text-center text-sm">
                  Already have an account?{' '}
                  <Button variant="link" asChild className="px-0 font-normal">
                    <Link to="/login">
                      Sign in
                    </Link>
                  </Button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOAuthLogin('github')}
                    className="w-full"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOAuthLogin('google')}
                    className="w-full"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="text-center space-y-4 py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-semibold">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-base space-y-2">
                <p>We've sent a confirmation email to <strong>{formik.values.email}</strong></p>
                <p>Please follow the steps in the email to confirm your account.</p>
                <p className="text-sm text-muted-foreground mt-4">
                  Redirecting to login in a few seconds...
                </p>
              </CardDescription>
              <Button variant="link" asChild className="px-0 font-normal">
                <Link to="/login">
                  Back to Login
                </Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;