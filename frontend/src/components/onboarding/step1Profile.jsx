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

      <div className="space-y-4">
        <Label className="text-base font-medium text-foreground">
          Are you currently employed?
        </Label>
        <RadioGroup
          defaultValue={formik.values.isEmployed}
          onValueChange={(value) => formik.setFieldValue('isEmployed', value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <label className="flex items-center p-4 border border-border rounded-xl cursor-pointer hover:bg-lumos-primary-light/20 transition-colors group">
            <RadioGroupItem value="yes" id="employed-yes" className="mr-3" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Yes, I'm employed</div>
                <div className="text-sm text-muted-foreground">Currently working</div>
              </div>
            </div>
          </label>
          
          <label className="flex items-center p-4 border border-border rounded-xl cursor-pointer hover:bg-lumos-primary-light/20 transition-colors group">
            <RadioGroupItem value="no" id="employed-no" className="mr-3" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
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