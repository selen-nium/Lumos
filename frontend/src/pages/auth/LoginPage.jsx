import { useState } from 'react';
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
import { AlertCircle } from "lucide-react";
import Logo from '../../components/common/Logo';

const LoginPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('*Email is required'),
      password: Yup.string()
        .required('*Password is required'),
    }),
    onSubmit: async (values) => {
      setIsLoading(true);
      setError('');
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        
        if (error) throw error;
        
        navigate('/home');
      } catch (error) {
        console.error('Login error:', error);
        setError(error.message || 'Failed to sign in');
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleOAuthLogin = async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      setError(error.message || `Failed to sign in with ${provider}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex min-h-screen">
        {/* Left side - Logo */}
        <div className="hidden lg:flex lg:w-5/12 flex-col justify-center items-center bg-muted/30">
          <div className="max-w-md text-center space-y-6">
            <Logo />
          </div>
        </div>
        
        {/* Right side - Login form */}
        <div className="flex-1 lg:w-7/12 flex justify-center items-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-semibold text-center">
                Sign in
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={formik.handleSubmit} className="space-y-3">
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
                    placeholder="Enter your password"
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
                
                <div className="flex justify-end">
                  <Button variant="link" asChild className="px-0 font-normal">
                    <Link to="/forgot-password">
                      Forgot password?
                    </Link>
                  </Button>
                </div>

                {error && (
                  <Alert className="border-red-600 bg-red-50">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <AlertTitle className="text-red-600 font-medium">
                        Login Error
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
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
              
              <div className="text-center text-sm">
                Don't have an account?{' '}
                <Button variant="link" asChild className="px-0 font-normal">
                  <Link to="/register">
                    Sign up
                  </Link>
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-1 text-muted-foreground">
                    or continue with
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
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
