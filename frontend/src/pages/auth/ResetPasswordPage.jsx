import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";
import Logo from '../../components/common/Logo';

const ResetPasswordPage = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        if (type === 'recovery' && accessToken) {
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
        .required('*Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('*Please confirm your password'),
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
    <div className="min-h-screen bg-gradient-to-br from-lumos-primary-light via-white to-blue-50 relative">
      
      <div className="relative z-10 container mx-auto flex min-h-screen">
        {/* Left side - Logo and Welcome */}
        <div className="hidden lg:flex lg:w-5/12 flex-col justify-center items-center p-8">
          <div className="max-w-md text-center space-y-8">
            <div className="mb-8">
              <Logo />
            </div>
          </div>
        </div>
        
        {/* Right side - Form */}
        <div className="flex-1 lg:w-7/12 flex justify-center items-center p-6">
          <Card className="w-full max-w-md card-minimal-hover bg-white/90 backdrop-blur-sm border border-lumos-primary/20 animate-slide-up">
            {isSuccess ? (
              <CardContent className="text-center space-y-6 py-8">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-lumos-primary-light rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-lumos-primary" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-foreground">
                  Password Updated
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Your password has been successfully reset. You will be redirected to the login page shortly.
                </CardDescription>
                <Button variant="link" asChild className="px-0 font-semibold text-lumos-primary hover:text-lumos-primary-dark">
                  <Link to="/login">
                    Continue to Login
                  </Link>
                </Button>
              </CardContent>
            ) : (
              <>
                <CardHeader className="space-y-2 text-center">
                  <div className="lg:hidden mb-4">
                    <Logo />
                  </div>
                  <CardTitle className="text-3xl font-bold text-foreground">
                    Reset Password
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {email
                      ? `Set a new password for ${email}`
                      : 'Enter your new password'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {error ? (
                    <div className="space-y-4">
                      <Alert className="border-red-200 bg-red-50 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <div>
                            <AlertTitle className="text-red-800 font-semibold">
                              Reset Error
                            </AlertTitle>
                            <AlertDescription className="text-red-700">
                              {error}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 btn-outline-rounded hover-lift border-red-500 text-red-600 hover:bg-red-50"
                        onClick={() => navigate('/forgot-password')}
                      >
                        Request New Reset Link
                      </Button>
                      <div className="text-center">
                        <Button variant="link" asChild className="px-0 font-semibold text-lumos-primary hover:text-lumos-primary-dark">
                          <Link to="/login">
                            Back to Login
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={formik.handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-base font-medium">New Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Enter new password"
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-base font-medium">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="Confirm new password"
                          value={formik.values.confirmPassword}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className={`h-12 text-base focus:border-lumos-primary focus:ring-lumos-primary/20 ${
                            formik.touched.confirmPassword && formik.errors.confirmPassword
                              ? 'border-red-500 focus:border-red-500'
                              : ''
                          }`}
                        />
                        {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                          <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                            {formik.errors.confirmPassword}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold btn-primary-rounded hover-lift"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                      
                      <div className="text-center">
                        <Button variant="link" asChild className="px-0 font-semibold text-lumos-primary hover:text-lumos-primary-dark">
                          <Link to="/login">
                            Back to Login
                          </Link>
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;