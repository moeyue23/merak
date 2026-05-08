import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorPageProps {
  code?: string;
  title?: string;
  description?: string;
}

function getHomePath() {
  const token = localStorage.getItem('accessToken');
  return token ? '/app' : '/';
}

export default function ErrorPage({
  code = '404',
  title = 'Page Not Found',
  description = 'The page you are looking for does not exist.',
}: ErrorPageProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate(getHomePath());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold">{code}</CardTitle>
          <CardDescription className="text-lg">{title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <Button onClick={handleGoHome} className="w-full">
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
