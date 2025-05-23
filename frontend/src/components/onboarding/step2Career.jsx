import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const Step2Career = ({ formik }) => (
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
          <SelectItem value="early-career">Early Career</SelectItem>
          <SelectItem value="mid-career">Mid Career</SelectItem>
          <SelectItem value="senior">Senior</SelectItem>
          <SelectItem value="career-break">Career Break</SelectItem>
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

    <div className="space-y-2">
      <Label>I’d like to join as:</Label>
      <RadioGroup
        defaultValue={formik.values.userType}
        onValueChange={(value) => formik.setFieldValue('userType', value)}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="mentee" id="mentee" />
          <Label htmlFor="mentee">Mentee</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="mentor" id="mentor" />
          <Label htmlFor="mentor">Mentor</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="both" id="both" />
          <Label htmlFor="both">Both</Label>
        </div>
      </RadioGroup>
    </div>
  </div>
);

export default Step2Career;
