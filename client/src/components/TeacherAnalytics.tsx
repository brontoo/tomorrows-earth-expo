import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function TeacherAnalytics() {
  // Sample analytics data - will be connected to backend
  const analyticsData = {
    projectsReviewed: 24,
    averageReviewTime: 45, // minutes
    studentEngagementScore: 8.5, // out of 10
    feedbackSent: 28,
    approvalRate: 85,
    revisionRate: 15,
  };

  const metrics = [
    {
      title: "Projects Reviewed",
      value: analyticsData.projectsReviewed,
      icon: CheckCircle,
      color: "bg-green-500/10 text-green-600",
    },
    {
      title: "Avg Review Time",
      value: `${analyticsData.averageReviewTime}m`,
      icon: Clock,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Feedback Sent",
      value: analyticsData.feedbackSent,
      icon: BarChart3,
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Approval Rate",
      value: `${analyticsData.approvalRate}%`,
      icon: TrendingUp,
      color: "bg-orange-500/10 text-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {metric.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {metric.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Approved</span>
                  <span className="text-sm text-muted-foreground">85%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Needs Revision</span>
                  <span className="text-sm text-muted-foreground">15%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: "15%" }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Review Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { day: "Mon", reviews: 4 },
                { day: "Tue", reviews: 6 },
                { day: "Wed", reviews: 5 },
                { day: "Thu", reviews: 7 },
                { day: "Fri", reviews: 2 },
              ].map((item) => (
                <div key={item.day}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.day}</span>
                    <span className="text-sm text-muted-foreground">{item.reviews}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(item.reviews / 7) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Engagement */}
      <Card>
        <CardHeader>
          <CardTitle>Student Engagement Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="text-5xl font-bold text-primary mb-2">
                {analyticsData.studentEngagementScore}/10
              </div>
              <p className="text-muted-foreground">
                Based on feedback quality, response time, and student satisfaction
              </p>
            </div>
            <div className="w-32 h-32 rounded-full border-8 border-primary/20 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {Math.round((analyticsData.studentEngagementScore / 10) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
