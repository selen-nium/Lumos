import { useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-background flex">
      {/* Left side - Logo and branding */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-center items-center bg-muted/30">
        <div className="max-w-md text-center space-y-6">
          <Logo />
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 lg:w-7/12 flex justify-center items-center p-6">
        <Card className="w-full max-w-md">
          {!isSubmitted ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-semibold text-center">
                  Reset Password
                </CardTitle>
                <CardDescription className="text-center">
                  Enter your email address and we'll send you a reset link
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
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  
                  <div className="text-center">
                    <Button variant="link" asChild className="px-0 font-normal">
                      <Link to="/login">
                        Back to Login
                      </Link>
                    </Button>
                  </div>
                </form>
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
              <CardDescription className="text-base">
                We've sent a password reset link to <strong>{formik.values.email}</strong>
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

export default ForgotPasswordPage;
