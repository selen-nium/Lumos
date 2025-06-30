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
import { AlertCircle, Github } from "lucide-react";
import Logo from '../../components/common/Logo';

// Background Pattern Component
const BackgroundPattern = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-lumos-primary/10 to-lumos-primary-light/5 rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
    <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-lumos-primary/5 to-lumos-primary-muted/10 rounded-full filter blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
  </div>
);

const LoginPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Function to check onboarding status and redirect appropriately
  const checkOnboardingAndRedirect = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_complete, user_type')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking onboarding status:', error);
        // If we can't check onboarding status, assume it's not complete
        navigate('/onboarding');
        return;
      }

      if (!profile) {
        // No profile found, redirect to onboarding
        navigate('/onboarding');
        return;
      }

      if (profile.onboarding_complete) {
        // Onboarding is complete, redirect to home
        navigate('/home');
      } else {
        // Onboarding is not complete, redirect to onboarding
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Error in checkOnboardingAndRedirect:', error);
      // Default to onboarding if there's an error
      navigate('/onboarding');
    }
  };

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
        
        // Check onboarding status before redirecting
        if (data.user) {
          await checkOnboardingAndRedirect(data.user.id);
        } else {
          navigate('/home'); // Fallback
        }
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
          redirectTo: `${window.location.origin}/auth/callback`, // Changed to use callback
        },
      });
      
      if (error) throw error;
    } catch (error) {
      setError(error.message || `Failed to sign in with ${provider}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50 relative">
      <BackgroundPattern />
      
      <div className="relative z-10 container mx-auto flex min-h-screen">
        {/* Left side - Logo and Welcome */}
        <div className="hidden lg:flex lg:w-5/12 flex-col justify-center items-center p-8">
          <div className="max-w-md text-center space-y-8">
            <div className="mb-8">
              <Logo />
            </div>
            
            <div className="space-y-6">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-black">
                Welcome Back
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Continue your learning journey with personalized mentorship and curated content.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Login form */}
        <div className="flex-1 lg:w-7/12 flex justify-center items-center p-6">
          <Card className="w-full max-w-md card-minimal-hover bg-white/90 backdrop-blur-sm border border-lumos-primary/20 animate-slide-up">
            <CardHeader className="space-y-2 text-center">
              <div className="lg:hidden mb-4">
                <Logo />
              </div>
              <CardTitle className="text-3xl font-bold text-foreground">
                Sign In
              </CardTitle>
              <p className="text-muted-foreground">
                Welcome back! Please sign in to continue
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={formik.handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`h-12 text-base focus:border-lumos-primary focus:ring-lumos-primary/20 ${
                      formik.touched.email && formik.errors.email
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                  />
                  {formik.touched.email && formik.errors.email && (
                    <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {formik.errors.email}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={`h-12 text-base focus:border-lumos-primary focus:ring-lumos-primary/20 ${
                      formik.touched.password && formik.errors.password
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                  />
                  {formik.touched.password && formik.errors.password && (
                    <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {formik.errors.password}
                    </p>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button variant="link" asChild className="px-0 font-normal text-lumos-primary hover:text-lumos-primary-dark">
                    <Link to="/forgot-password">
                      Forgot password?
                    </Link>
                  </Button>
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <AlertTitle className="text-red-800 font-semibold">
                          Login Error
                        </AlertTitle>
                        <AlertDescription className="text-red-700">
                          {error}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
                
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold btn-primary-rounded hover-lift"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
              
              <div className="text-center">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Button variant="link" asChild className="px-0 font-semibold text-lumos-primary hover:text-lumos-primary-dark">
                  <Link to="/register">
                    Sign up here
                  </Link>
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-muted-foreground font-medium">
                    or continue with
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('github')}
                  className="w-full h-12 btn-outline-rounded hover-lift"
                >
                  <Github className="w-5 h-5 mr-2" />
                  GitHub
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthLogin('google')}
                  className="w-full h-12 btn-outline-rounded hover-lift"
                >
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