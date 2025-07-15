import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { User, Users, UserCheck } from 'lucide-react';

const Step1Profile = ({ formik }) => (
  <div className="space-y-8">
    <div className="text-center mb-8">
      <div className="w-16 h-16 bg-gradient-to-br from-lumos-primary to-lumos-primary-dark rounded-full flex items-center justify-center mx-auto mb-4">
        <User className="w-8 h-8 text-black" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Lumos!</h2>
      <p className="text-muted-foreground">Let's start with some basic information about you</p>
    </div>

    <div className="space-y-6">
      {/* Username field */}
      <div className="space-y-3">
        <Label htmlFor="username" className="text-base font-medium text-foreground">
          Choose your username
        </Label>
        <Input
          id="username"
          name="username"
          value={formik.values.username}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="Enter a unique username"
          className="h-12 text-base focus:border-lumos-primary focus:ring-lumos-primary/20"
        />
        {formik.touched.username && formik.errors.username && (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <span className="w-1 h-1 bg-red-600 rounded-full"></span>
            {formik.errors.username}
          </p>
        )}
      </div>

      {/* Employment Status - ENHANCED with selected state styling */}
      <div className="space-y-4">
        <Label className="text-base font-medium text-foreground">
          Are you currently employed?
        </Label>
        <RadioGroup
          defaultValue={formik.values.isEmployed}
          onValueChange={(value) => formik.setFieldValue('isEmployed', value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Yes, I'm employed */}
          <label 
            className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 group ${
              formik.values.isEmployed === 'yes'
                ? 'border-2 border-lumos-primary bg-lumos-primary/10 shadow-md' // Selected state
                : 'border border-border hover:bg-lumos-primary-light/20 hover:border-lumos-primary/50' // Unselected state
            }`}
          >
            <RadioGroupItem value="yes" id="employed-yes" className="mr-3" />
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                formik.values.isEmployed === 'yes'
                  ? 'bg-green-200' // Selected state
                  : 'bg-green-100 group-hover:bg-green-200' // Unselected state
              }`}>
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Yes, I'm employed</div>
                <div className="text-sm text-muted-foreground">Currently working</div>
              </div>
            </div>
          </label>

          {/* No, I'm not employed */}
          <label 
            className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 group ${
              formik.values.isEmployed === 'no'
                ? 'border-2 border-lumos-primary bg-lumos-primary/10 shadow-md' // Selected state
                : 'border border-border hover:bg-lumos-primary-light/20 hover:border-lumos-primary/50' // Unselected state
            }`}
          >
            <RadioGroupItem value="no" id="employed-no" className="mr-3" />
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                formik.values.isEmployed === 'no'
                  ? 'bg-blue-200' // Selected state
                  : 'bg-blue-100 group-hover:bg-blue-200' // Unselected state
              }`}>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">No, I'm not employed</div>
                <div className="text-sm text-muted-foreground">Student or looking for work</div>
              </div>
            </div>
          </label>
        </RadioGroup>
      </div>
    </div>
  </div>
);

export default Step1Profile;