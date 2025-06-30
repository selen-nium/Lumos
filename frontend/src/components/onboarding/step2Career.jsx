import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, GraduationCap, Users, BookOpen, Award, Clock, Shield } from 'lucide-react';

const Step2Career = ({ formik }) => {
  const isMentor = formik.values.userType === 'mentor' || formik.values.userType === 'both';
  const isMentee = formik.values.userType === 'mentee' || formik.values.userType === 'both';

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-black" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Career Information</h2>
        <p className="text-muted-foreground">Help us understand your background and goals</p>
      </div>

      <div className="space-y-6">
        {/* Career Stage */}
        <div className="space-y-3">
          <Label htmlFor="careerStage" className="text-base font-medium text-foreground">
            What's your career stage?
          </Label>
          <Select
            value={formik.values.careerStage}
            onValueChange={(value) => formik.setFieldValue('careerStage', value)}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Select your career stage" />
            </SelectTrigger>
            <SelectContent className='bg-white shadow-lg'>
              <SelectItem value="student">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Student
                </div>
              </SelectItem>
              <SelectItem value="early-career">Early Career (0-2 years)</SelectItem>
              <SelectItem value="mid-career">Mid Career (3-7 years)</SelectItem>
              <SelectItem value="senior">Senior (8+ years)</SelectItem>
              <SelectItem value="career-break">Career Break/Re-entering</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Employment Details */}
        {formik.values.isEmployed === 'yes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="company" className="text-base font-medium text-foreground">
                Company
              </Label>
              <Input
                id="company"
                name="company"
                value={formik.values.company}
                onChange={formik.handleChange}
                placeholder="Your company name"
                className="h-12 text-base focus:border-lumos-primary focus:ring-lumos-primary/20"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="role" className="text-base font-medium text-foreground">
                Role/Title
              </Label>
              <Input
                id="role"
                name="role"
                value={formik.values.role}
                onChange={formik.handleChange}
                placeholder="Your current role"
                className="h-12 text-base focus:border-lumos-primary focus:ring-lumos-primary/20"
              />
            </div>
          </div>
        )}

        {/* User Type Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium text-foreground">
            How would you like to participate in our community?
          </Label>
          <div className='flex w-full'>
            <RadioGroup
              defaultValue={formik.values.userType}
              onValueChange={(value) => formik.setFieldValue('userType', value)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <label className="flex flex-col items-center p-6 border border-border rounded-xl cursor-pointer hover:bg-lumos-primary-light/20 transition-colors group">
                <RadioGroupItem value="mentee" id="mentee" className="mb-4" />
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-center">
                  <div className="font-semibold">Mentee</div>
                  <div className="text-sm text-muted-foreground mt-1">Learn new skills</div>
                </div>
              </label>
              <label className="flex flex-col items-center p-6 border border-border rounded-xl cursor-pointer hover:bg-lumos-primary-light/20 transition-colors group">
                <RadioGroupItem value="mentor" id="mentor" className="mb-4" />
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-center">
                  <div className="font-semibold">Mentor</div>
                  <div className="text-sm text-muted-foreground mt-1">Help mentees in the community</div>
                </div>
              </label>
              <label className="flex flex-col items-center p-6 border border-border rounded-xl cursor-pointer hover:bg-lumos-primary-light/20 transition-colors group">
                <RadioGroupItem value="both" id="both" className="mb-4" />
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-center">
                  <div className="font-semibold">Both</div>
                  <div className="text-sm text-muted-foreground mt-1">Learn and mentor others</div>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        {/* Mentor-specific fields */}
        {isMentor && (
          <div className="space-y-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">Mentor Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Label htmlFor="yearsExperience" className="text-base font-medium text-foreground">
                  Years of Experience
                </Label>
                <Input
                  type="number"
                  id="yearsExperience"
                  name="yearsExperience"
                  value={formik.values.yearsExperience || ''}
                  onChange={formik.handleChange}
                  // placeholder="5"
                  min="1"
                  max="50"
                  className="h-12 text-base focus:border-green-500 focus:ring-green-500/20"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="availabilityHours" className="text-base font-medium text-foreground">
                  Mentoring Availability
                </Label>
                <Select
                  value={formik.values.availabilityHours || '2 hours/week'}
                  onValueChange={(value) => formik.setFieldValue('availabilityHours', value)}
                >
                  <SelectTrigger className="h-12 text-base focus:border-green-500">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent className='bg-white shadow-lg'>
                    <SelectItem value="1 hour/week">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        1 hour/week
                      </div>
                    </SelectItem>
                    <SelectItem value="2 hours/week">2 hours/week</SelectItem>
                    <SelectItem value="3 hours/week">3 hours/week</SelectItem>
                    <SelectItem value="4+ hours/week">4+ hours/week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="mentorBio" className="text-base font-medium text-foreground">
                Mentor Bio
              </Label>
              <Textarea
                id="mentorBio"
                name="mentorBio"
                value={formik.values.mentorBio || ''}
                onChange={formik.handleChange}
                placeholder="Tell potential mentees about your experience, expertise, and what you can help them with. Share your journey and what motivates you to mentor others..."
                className="h-32 text-base focus:border-green-500 focus:ring-green-500/20 resize-none"
                maxLength={500}
              />
              <div className="text-right text-xs text-muted-foreground">
                {(formik.values.mentorBio || '').length}/500 characters (minimum 50)
              </div>
            </div>

            {/* Mentor verification notice */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-800">Mentor Verification Required</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Our team will contact you via email for verification to ensure the quality and safety of our mentoring community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mentee-specific fields */}
        {isMentee && (
          <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-800">Learning Preferences</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="weeklyLearningHours" className="text-base font-medium text-foreground">
                  Weekly Learning Hours
                </Label>
                <Input
                  type="number"
                  id="weeklyLearningHours"
                  name="weeklyLearningHours"
                  value={formik.values.weeklyLearningHours}
                  onChange={formik.handleChange}
                  min="1"
                  max="40"
                  className="h-12 text-base focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="preferredLearningTime" className="text-base font-medium text-foreground">
                  Preferred Learning Time
                </Label>
                <Select
                  value={formik.values.preferredLearningTime}
                  onValueChange={(value) => formik.setFieldValue('preferredLearningTime', value)}
                >
                  <SelectTrigger className="h-12 text-base focus:border-blue-500">
                    <SelectValue placeholder="When do you prefer to learn?" />
                  </SelectTrigger>
                  <SelectContent className='bg-white shadow-lg'>
                    <SelectItem value="morning">🌅 Morning</SelectItem>
                    <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
                    <SelectItem value="evening">🌆 Evening</SelectItem>
                    <SelectItem value="late-night">🌙 Late Night</SelectItem>
                    <SelectItem value="weekend">📅 Weekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Step2Career;