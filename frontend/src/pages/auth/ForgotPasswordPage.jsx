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
import { CheckCircle, AlertCircle } from "lucide-react";
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
        .required('*Email is required'),
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
            {!isSubmitted ? (
              <>
                <CardHeader className="space-y-2 text-center">
                  <div className="lg:hidden mb-4">
                    <Logo />
                  </div>
                  <CardTitle className="text-3xl font-bold text-foreground">
                    Reset Password
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Enter your email address and we'll send you a reset link
                  </CardDescription>
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

                    {error && (
                      <Alert className="border-red-200 bg-red-50 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <div>
                            <AlertDescription className="text-red-700 font-medium">
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
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
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
                </CardContent>
              </>
            ) : (
              <CardContent className="text-center space-y-6 py-8">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-lumos-primary-light rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-lumos-primary" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-foreground">
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  We've sent a password reset link to{' '}
                  <span className="font-semibold text-lumos-primary">{formik.values.email}</span>
                  <br />
                  Please check your inbox and follow the instructions.
                </CardDescription>
                <Button variant="link" asChild className="px-0 font-semibold text-lumos-primary hover:text-lumos-primary-dark">
                  <Link to="/login">
                    Back to Login
                  </Link>
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;