import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Button } from "@/components/ui/button";

export const UnauthenticatedView = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-full max-w-lg bg-muted">
        <Item variant="outline">
          <ItemMedia variant="icon">
            <ShieldAlertIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Unauthorized Access</ItemTitle>
            <ItemDescription>
              You are not authorized to access this resource. Please sign in to continue.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Link href="/handler/sign-in">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          </ItemActions>
        </Item>
      </div>
    </div>
  );
};
