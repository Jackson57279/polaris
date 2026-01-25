import { AlertCircle, Sparkles } from 'lucide-react';
import { useAutumnUsage } from '@/hooks/use-autumn-usage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function ProjectUsageBanner() {
  const { projects, isLoading } = useAutumnUsage();
  const router = useRouter();

  if (isLoading || !projects) {
    return null;
  }

  const { usage, limit, allowed } = projects;
  const percentage = (usage / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = !allowed;

  if (!isNearLimit && !isAtLimit) {
    return null;
  }

  return (
    <Alert variant={isAtLimit ? 'destructive' : 'default'} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          {isAtLimit ? (
            <>
              <strong>Project limit reached</strong> - You've used {usage} of {limit} projects this month.
            </>
          ) : (
            <>
              <strong>Approaching limit</strong> - You've used {usage} of {limit} projects this month.
            </>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push('/billing')}
          className="ml-4"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Upgrade to Pro
        </Button>
      </AlertDescription>
    </Alert>
  );
}
