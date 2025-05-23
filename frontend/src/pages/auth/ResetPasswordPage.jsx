import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
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
    <div className="min-h-screen bg-background flex">
      {/* Left side - Logo and branding */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-center items-center bg-muted/10 p-8">
        <div className="max-w-md text-center space-y-6">
          <Logo />
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 lg:w-7/12 flex justify-center items-center p-8">
        <Card className="w-full max-w-md">
          {isSuccess ? (
            <CardContent className="text-center space-y-4 py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-semibold">
                Password Updated
              </CardTitle>
              <CardDescription className="text-base">
                Your password has been successfully reset. You will be redirected to the login page shortly.
              </CardDescription>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-semibold text-center">
                  Reset Password
                </CardTitle>
                <CardDescription className="text-center">
                  {email ? `Set a new password for ${email}` : 'Enter your new password'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {error ? (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/forgot-password')}
                    >
                      Request New Reset Link
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter new password"
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
                        placeholder="Confirm new password"
                        value={formik.values.confirmPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className={formik.touched.confirmPassword && formik.errors.confirmPassword ? 'border-destructive' : ''}
                      />
                      {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                        <p className="text-sm text-destructive">{formik.errors.confirmPassword}</p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;