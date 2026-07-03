import {
  History,
  LayoutDashboard,
  Menu,
  Shield,
  Users,
} from 'lucide-react';
import { createElement } from 'react';
import { ADMIN_ROUTES, DEFAULT_WEB_APP_URL } from '@vokop/shared';
import type { AdminShellConfig } from './types';

const icon = (Icon: typeof LayoutDashboard) => createElement(Icon, { className: 'w-4 h-4' });

/** Vokop platform admin navigation (users, RBAC, menus). */
export const vokopAdminNav: AdminShellConfig = {
  mode: 'router',
  brand: {
    name: 'Vokop',
    highlight: 'Admin',
    logoAlt: 'Vokop Admin',
  },
  webAppUrl: DEFAULT_WEB_APP_URL,
  nav: [
    {
      category: 'Platform',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: icon(LayoutDashboard),
          type: 'dashboard',
          path: ADMIN_ROUTES.home,
        },
        {
          id: 'users',
          label: 'Users',
          icon: icon(Users),
          type: 'users',
          path: ADMIN_ROUTES.users,
        },
        {
          id: 'rbac',
          label: 'Roles & RBAC',
          icon: icon(Shield),
          type: 'rbac',
          path: ADMIN_ROUTES.rbac,
        },
        {
          id: 'menus',
          label: 'Admin menus',
          icon: icon(Menu),
          type: 'menus',
          path: ADMIN_ROUTES.menus,
        },
        {
          id: 'activity',
          label: 'Activity log',
          icon: icon(History),
          type: 'activity',
          path: ADMIN_ROUTES.activity,
        },
      ],
    },
  ],
};
