// Step1Profile.jsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const Step1Profile = ({ formik }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Your Profile</h2>

    <div className="space-y-2">
      <Label htmlFor="username">Username</Label>
      <Input
        id="username"
        name="username"
        value={formik.values.username}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        placeholder="Choose a username"
      />
      {formik.touched.username && formik.errors.username && (
        <p className="text-sm text-error">{formik.errors.username}</p>
      )}
    </div>

    <div className="space-y-2">
      <Label>Are you currently employed?</Label>
      <RadioGroup
        defaultValue={formik.values.isEmployed}
        onValueChange={(value) => formik.setFieldValue('isEmployed', value)}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id="employed-yes" />
          <Label htmlFor="employed-yes">Yes</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id="employed-no" />
          <Label htmlFor="employed-no">No</Label>
        </div>
      </RadioGroup>
    </div>
  </div>
);

export default Step1Profile;