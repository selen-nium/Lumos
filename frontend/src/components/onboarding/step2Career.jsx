import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

const Step2Career = ({ formik }) => {
  const isMentor = formik.values.userType === 'mentor' || formik.values.userType === 'both';
  const isMentee = formik.values.userType === 'mentee' || formik.values.userType === 'both';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Career Information</h2>

      <div className="space-y-2">
        <Label htmlFor="careerStage">Career Stage</Label>
        <Select
          value={formik.values.careerStage}
          onValueChange={(value) => formik.setFieldValue('careerStage', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select stage" />
          </SelectTrigger>
          <SelectContent className='bg-white'>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="early-career">Early Career (0-2 years)</SelectItem>
            <SelectItem value="mid-career">Mid Career (3-7 years)</SelectItem>
            <SelectItem value="senior">Senior (8+ years)</SelectItem>
            <SelectItem value="career-break">Career Break/Re-entering</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formik.values.isEmployed === 'yes' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              value={formik.values.company}
              onChange={formik.handleChange}
              placeholder="Company name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role/Title</Label>
            <Input
              id="role"
              name="role"
              value={formik.values.role}
              onChange={formik.handleChange}
              placeholder="Your current role"
            />
          </div>
        </>
      )}

      {/* Mentor-specific fields */}
      {isMentor && (
        <>
          <div className="space-y-2">
            <Label htmlFor="yearsExperience">Years of Experience</Label>
            <Input
              type="number"
              id="yearsExperience"
              name="yearsExperience"
              value={formik.values.yearsExperience || ''}
              onChange={formik.handleChange}
              placeholder="Years of professional experience"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mentorBio">Mentor Bio</Label>
            <Textarea
              id="mentorBio"
              name="mentorBio"
              value={formik.values.mentorBio || ''}
              onChange={formik.handleChange}
              placeholder="Tell potential mentees about your experience and what you can help with..."
              className="h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availabilityHours">Mentoring Availability</Label>
            <Select
              value={formik.values.availabilityHours || '2 hours/week'}
              onValueChange={(value) => formik.setFieldValue('availabilityHours', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent className='bg-white'>
                <SelectItem value="1 hour/week">1 hour/week</SelectItem>
                <SelectItem value="2 hours/week">2 hours/week</SelectItem>
                <SelectItem value="3 hours/week">3 hours/week</SelectItem>
                <SelectItem value="4+ hours/week">4+ hours/week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mentor verification notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-sm">ℹ️</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Mentor Verification Required</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Our team will get in touch with you via your registered email for verification purposes. 
                  This helps us ensure the quality and safety of our mentoring community.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mentee-specific fields */}
      {isMentee && (
        <>
          <div className="space-y-2">
            <Label htmlFor="weeklyLearningHours">Weekly Learning Hours</Label>
            <Input
              type="number"
              id="weeklyLearningHours"
              name="weeklyLearningHours"
              value={formik.values.weeklyLearningHours}
              onChange={formik.handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredLearningTime">Preferred Learning Time</Label>
            <Select
              value={formik.values.preferredLearningTime}
              onValueChange={(value) => formik.setFieldValue('preferredLearningTime', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className='bg-white'>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="late-night">Late Night</SelectItem>
                <SelectItem value="weekend">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>I'd like to join as:</Label>
        <RadioGroup
          defaultValue={formik.values.userType}
          onValueChange={(value) => formik.setFieldValue('userType', value)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mentee" id="mentee" />
            <Label htmlFor="mentee">Mentee (looking to learn)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mentor" id="mentor" />
            <Label htmlFor="mentor">Mentor (looking to guide others)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="both" id="both" />
            <Label htmlFor="both">Both</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default Step2Career;