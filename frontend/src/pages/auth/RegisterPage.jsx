import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";
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
                      className={
                        formik.touched.email && formik.errors.email
                          ? 'border-red-600 focus:border-red-600'
                          : ''
                      }
                    />
                    {formik.touched.email && formik.errors.email && (
                      <p className="text-sm text-red-600 font-medium">
                        {formik.errors.email}
                      </p>
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
                      className={
                        formik.touched.password && formik.errors.password
                          ? 'border-red-600 focus:border-red-600'
                          : ''
                      }
                    />
                    {formik.touched.password && formik.errors.password && (
                      <p className="text-sm text-red-600 font-medium">
                        {formik.errors.password}
                      </p>
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
                      className={
                        formik.touched.confirmPassword && formik.errors.confirmPassword
                          ? 'border-red-600 focus:border-red-600'
                          : ''
                      }
                    />
                    {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                      <p className="text-sm text-red-600 font-medium">
                        {formik.errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {error && (
                    <Alert className="border-red-600 bg-red-50">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <AlertTitle className="text-red-600 font-medium">
                          Registration Error
                        </AlertTitle>
                      </div>
                      <AlertDescription className="text-red-600 font-medium">
                        {error}
                      </AlertDescription>
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
                    {/* GitHub SVG omitted for brevity */}
                    GitHub
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOAuthLogin('google')}
                    className="w-full"
                  >
                    {/* Google SVG omitted for brevity */}
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
              <div className="text-base">
                <p>
                  We&apos;ve sent a confirmation email to{' '}
                  <strong className="text-red-600">{formik.values.email}</strong>
                </p>
                <p>Please follow the steps in the email to confirm your account.</p>
                <p className="text-sm text-muted-foreground mt-4">
                  Redirecting to login in a few seconds...
                </p>
              </div>
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