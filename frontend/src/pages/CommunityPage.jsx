import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Layout from '@/components/common/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const CommunityPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mentors');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Mock mentors data
  const [mentors] = useState([ /* same array as before */
    { id: 1, name: 'Emily Chen', initials: 'EC', role: 'Senior Software Engineer at Google', experience: '8+ years', availability: '2 hours/week', bio: 'I specialize in frontend development and enjoy helping others grow in their technical careers. Happy to provide guidance on interview prep and career transitions.', skills: ['React', 'Node.js', 'System Design'], avatar: null },
    { id: 2, name: 'Maria Rodriguez', initials: 'MR', role: 'Tech Lead at Microsoft', experience: '10+ years', availability: '3 hours/week', bio: 'Passionate about helping women succeed in tech leadership roles. I can provide guidance on technical growth and navigating corporate environments.', skills: ['Python', 'Cloud Architecture', 'Leadership'], avatar: null },
    { id: 3, name: 'James Wilson', initials: 'JW', role: 'Backend Developer at Amazon', experience: '5+ years', availability: '4 hours/week', bio: 'Focused on scalable backend systems and distributed computing. I enjoy mentoring on system design and performance optimization.', skills: ['Java', 'AWS', 'Microservices'], avatar: null },
    { id: 4, name: 'Aisha Patel', initials: 'AP', role: 'Data Scientist at Netflix', experience: '7+ years', availability: '2 hours/week', bio: 'Experienced in machine learning and data analysis. Happy to guide others in their data science journey and career planning.', skills: ['Python', 'Machine Learning', 'Data Visualization'], avatar: null }
  ]);

  // Mock study groups data
  const [studyGroups] = useState([ /* same array as before */
    { id: 1, name: 'Frontend Masters', members: 12, focus: 'React & Modern JavaScript', meetingTime: 'Tuesdays, 7PM EST', description: 'A group focused on mastering React and modern JavaScript frameworks through collaborative learning and project work.' },
    { id: 2, name: 'Data Science Study Circle', members: 8, focus: 'Python & Machine Learning', meetingTime: 'Saturdays, 10AM EST', description: 'Weekly meetings to work through data science problems and discuss machine learning concepts and implementations.' },
    { id: 3, name: 'Women in Tech', members: 15, focus: 'Career Development & Leadership', meetingTime: 'Every other Thursday, 6PM EST', description: 'A supportive community for women in tech to share experiences, advice, and resources for career growth.' }
  ]);

  // Mock accountability posts data
  const [accountabilityPosts] = useState([ /* same array as before */
    { id: 1, user: { name: 'Alex Johnson', initials: 'AJ' }, goal: 'Complete React authentication module by Friday', comments: 3, likes: 5, timestamp: '2 hours ago', isCompleted: false },
    { id: 2, user: { name: 'Taylor Kim', initials: 'TK' }, goal: 'Build a responsive portfolio website using CSS Grid', comments: 1, likes: 8, timestamp: '1 day ago', isCompleted: true },
    { id: 3, user: { name: 'Jordan Smith', initials: 'JS' }, goal: 'Implement user authentication in my Node.js project', comments: 5, likes: 4, timestamp: '3 days ago', isCompleted: false }
  ]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const filterMentors = () => {
    if (!searchQuery) return mentors;
    const q = searchQuery.toLowerCase();
    return mentors.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.skills.some(s => s.toLowerCase().includes(q))
    );
  };

  const filterStudyGroups = () => {
    if (!searchQuery) return studyGroups;
    const q = searchQuery.toLowerCase();
    return studyGroups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.focus.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-text">Community</h1>
        <p className="text-gray-600 mb-6">Connect with mentors and peers on your learning journey.</p>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="mentors" className='p-4'>Find Mentors</TabsTrigger>
            <TabsTrigger value="studyGroups" className='p-4'>Study Groups</TabsTrigger>
            <TabsTrigger value="accountability" className='p-4'>Accountability Board</TabsTrigger>
          </TabsList>

          <TabsContent value="mentors">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Input
                placeholder="Search mentors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                Filter Options
              </Button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block mb-1 text-sm font-medium">Skills</label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="All Skills" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="react">React</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="nodejs">Node.js</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Experience</label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-2">0-2 yrs</SelectItem>
                      <SelectItem value="3-5">3-5 yrs</SelectItem>
                      <SelectItem value="5+">5+ yrs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium">Availability</label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2">1-2 hrs/week</SelectItem>
                      <SelectItem value="3-5">3-5 hrs/week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterMentors().map(mentor => (
                <Card key={mentor.id}>
                  <CardContent className="flex items-start gap-4">
                    <Avatar>
                      {mentor.avatar
                        ? <AvatarImage src={mentor.avatar} alt={mentor.name} />
                        : <AvatarFallback>{mentor.initials}</AvatarFallback>
                      }
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-text">{mentor.name}</h3>
                      <p className="text-sm text-gray-500">{mentor.role}</p>
                      <div className="mt-1 text-xs text-gray-400">{mentor.experience} • {mentor.availability}</div>
                      <p className="mt-2 text-gray-600 text-sm">{mentor.bio}</p>
                      <div className="mt-2 flex flex-wrap gap-2">{mentor.skills.map(s => <Badge key={s}>{s}</Badge>)}</div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline">Message</Button>
                    <Button>Request Mentorship</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="studyGroups">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filterStudyGroups().map(group => (
                <Card key={group.id}>
                  <CardContent>
                    <h3 className="text-lg font-semibold text-text">{group.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{group.focus}</p>
                    <p className="text-xs text-gray-400 mt-1">{group.members} members • {group.meetingTime}</p>
                    <p className="mt-2 text-gray-600 text-sm">{group.description}</p>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button variant="outline" className="mr-2">View Details</Button>
                    <Button>Join Group</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="accountability">
            <Card className="mb-4">
              <CardContent>
                <Textarea placeholder="Share your weekly goal..." className="mb-2" />
                <Button>Post</Button>
              </CardContent>
            </Card>
            {accountabilityPosts.map(post => (
              <Card key={post.id} className={`mb-4 border-l-4 ${post.isCompleted ? 'border-btn-dark' : 'border-primary'}`}>
                <CardContent className="flex gap-3">
                  <Avatar>
                    <AvatarFallback>{post.user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-text">{post.user.name}</h3>
                      <span className="text-xs text-gray-400">{post.timestamp}</span>
                    </div>
                    <p className="mt-1 text-sm text-text">{post.goal}</p>
                    <div className="mt-2 flex gap-4 text-gray-500 text-sm">
                      <span>{post.likes} ❤️</span>
                      <span>{post.comments} 💬</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="text-center mt-4">
              <Button variant="outline">Load More</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CommunityPage;