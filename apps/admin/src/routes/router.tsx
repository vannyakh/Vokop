import React, { useEffect } from 'react';
import { createHashRouter, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ConfigProvider } from 'antd';
import { DashboardLayout } from '../components/templates/DashboardLayout';
import { DashboardPage } from '../components/pages/DashboardPage';
import { RolesPage } from '../components/pages/RolesPage';
import { OrdersPage } from '../components/pages/OrdersPage';
import { WalletPage } from '../components/pages/WalletPage';
import { UIShowcasePage } from '../components/pages/UIShowcasePage';
import { VerificationPage } from '../components/pages/VerificationPage';
import { StockPage } from '../components/pages/StockPage';
import { DisputesPage } from '../components/pages/DisputesPage';
import { TransactionsPage } from '../components/pages/TransactionsPage';
import { MessagesPage } from '../components/pages/MessagesPage';
import { ReviewsPage } from '../components/pages/ReviewsPage';
import { ProfilePage } from '../components/pages/ProfilePage';
import { CMSPage } from '../components/pages/CMSPage';
import { ApiKeysPage } from '../components/pages/ApiKeysPage';
import { ActivityLogPage } from '../components/pages/ActivityLogPage';
import { useTabs } from '../context/TabContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { getAntdThemeConfig } from '../themeConfig';

// Layout wrapper to bind router to the TabProvider!
const RootLayout: React.FC = () => {
  const { activeTabId, tabs, setActiveTabId, openTab } = useTabs();
  const { settings } = useSettings();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Sync route path TO tabs state
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') {
      if (activeTabId !== 'dashboard') {
        openTab('dashboard', 'Dashboard', 'dashboard');
      }
    } else if (path === '/catalog') {
      if (activeTabId !== 'catalog') {
        openTab('catalog', 'Catalog — Game keys', 'catalog');
      }
    } else if (path === '/orders') {
      if (activeTabId !== 'orders') {
        openTab('orders', 'Orders', 'orders');
      }
    } else if (path === '/wallet') {
      if (activeTabId !== 'wallet') {
        openTab('wallet', 'Wallet & Payouts', 'wallet');
      }
    } else if (path === '/uishowcase') {
      if (activeTabId !== 'uishowcase') {
        openTab('uishowcase', 'UI Libraries', 'uishowcase');
      }
    } else if (path === '/verification') {
      if (activeTabId !== 'verification') {
        openTab('verification', 'Verification', 'verification');
      }
    } else if (path === '/stock') {
      if (activeTabId !== 'stock') {
        openTab('stock', 'Stock & Delivery', 'stock');
      }
    } else if (path === '/disputes') {
      if (activeTabId !== 'disputes') {
        openTab('disputes', 'Disputes', 'disputes');
      }
    } else if (path === '/transactions') {
      if (activeTabId !== 'transactions') {
        openTab('transactions', 'Transactions', 'transactions');
      }
    } else if (path === '/messages') {
      if (activeTabId !== 'messages') {
        openTab('messages', 'Messages', 'messages');
      }
    } else if (path === '/reviews') {
      if (activeTabId !== 'reviews') {
        openTab('reviews', 'Reviews', 'reviews');
      }
    } else if (path === '/profile') {
      if (activeTabId !== 'profile') {
        openTab('profile', 'Shop Profile', 'profile');
      }
    } else if (path === '/cms') {
      if (activeTabId !== 'cms') {
        openTab('cms', 'Storefront CMS', 'cms');
      }
    } else if (path === '/api') {
      if (activeTabId !== 'api') {
        openTab('api', 'API Keys', 'api');
      }
    } else if (path === '/activity') {
      if (activeTabId !== 'activity') {
        openTab('activity', 'Activity Log', 'activity');
      }
    }
  }, [location.pathname]);

  // Sync tabs state TO route path
  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      if (activeTab.type === 'dashboard' && location.pathname !== '/dashboard' && location.pathname !== '/') {
        navigate('/');
      } else if (activeTab.type === 'catalog' && location.pathname !== '/catalog') {
        navigate('/catalog');
      } else if (activeTab.type === 'orders' && location.pathname !== '/orders') {
        navigate('/orders');
      } else if (activeTab.type === 'wallet' && location.pathname !== '/wallet') {
        navigate('/wallet');
      } else if (activeTab.type === 'uishowcase' && location.pathname !== '/uishowcase') {
        navigate('/uishowcase');
      } else if (activeTab.type === 'verification' && location.pathname !== '/verification') {
        navigate('/verification');
      } else if (activeTab.type === 'stock' && location.pathname !== '/stock') {
        navigate('/stock');
      } else if (activeTab.type === 'disputes' && location.pathname !== '/disputes') {
        navigate('/disputes');
      } else if (activeTab.type === 'transactions' && location.pathname !== '/transactions') {
        navigate('/transactions');
      } else if (activeTab.type === 'messages' && location.pathname !== '/messages') {
        navigate('/messages');
      } else if (activeTab.type === 'reviews' && location.pathname !== '/reviews') {
        navigate('/reviews');
      } else if (activeTab.type === 'profile' && location.pathname !== '/profile') {
        navigate('/profile');
      } else if (activeTab.type === 'cms' && location.pathname !== '/cms') {
        navigate('/cms');
      } else if (activeTab.type === 'api' && location.pathname !== '/api') {
        navigate('/api');
      } else if (activeTab.type === 'activity' && location.pathname !== '/activity') {
        navigate('/activity');
      }
    }
  }, [activeTabId, tabs, navigate, location.pathname]);

  const { transitionEnabled, transitionType, transitionSpeed } = settings;

  let initial = {};
  let animate = {};
  let exit = {};

  if (transitionEnabled) {
    if (transitionType === 'fade-blur') {
      initial = { opacity: 0, y: 12, filter: 'blur(6px)' };
      animate = { opacity: 1, y: 0, filter: 'blur(0px)' };
      exit = { opacity: 0, y: -12, filter: 'blur(6px)' };
    } else if (transitionType === 'slide') {
      initial = { opacity: 0, y: 30 };
      animate = { opacity: 1, y: 0 };
      exit = { opacity: 0, y: -30 };
    } else if (transitionType === 'fade') {
      initial = { opacity: 0 };
      animate = { opacity: 1 };
      exit = { opacity: 0 };
    } else if (transitionType === 'zoom') {
      initial = { opacity: 0, scale: 0.96 };
      animate = { opacity: 1, scale: 1 };
      exit = { opacity: 0, scale: 0.96 };
    }
  }

  let duration = 0.28;
  if (transitionSpeed === 'fast') {
    duration = 0.15;
  } else if (transitionSpeed === 'slow') {
    duration = 0.5;
  }

  return (
    <ConfigProvider theme={getAntdThemeConfig(theme)}>
      <DashboardLayout>
        {transitionEnabled ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={initial}
              animate={animate}
              exit={exit}
              transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col min-h-0 w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 w-full">
            <Outlet />
          </div>
        )}
      </DashboardLayout>
    </ConfigProvider>
  );
};

export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: '',
        element: <DashboardPage />
      },
      {
        path: 'dashboard',
        element: <DashboardPage />
      },
      {
        path: 'catalog',
        element: <RolesPage />
      },
      {
        path: 'orders',
        element: <OrdersPage />
      },
      {
        path: 'wallet',
        element: <WalletPage />
      },
      {
        path: 'uishowcase',
        element: <UIShowcasePage />
      },
      {
        path: 'verification',
        element: <VerificationPage />
      },
      {
        path: 'stock',
        element: <StockPage />
      },
      {
        path: 'disputes',
        element: <DisputesPage />
      },
      {
        path: 'transactions',
        element: <TransactionsPage />
      },
      {
        path: 'messages',
        element: <MessagesPage />
      },
      {
        path: 'reviews',
        element: <ReviewsPage />
      },
      {
        path: 'profile',
        element: <ProfilePage />
      },
      {
        path: 'cms',
        element: <CMSPage />
      },
      {
        path: 'api',
        element: <ApiKeysPage />
      },
      {
        path: 'activity',
        element: <ActivityLogPage />
      }
    ]
  }
]);
