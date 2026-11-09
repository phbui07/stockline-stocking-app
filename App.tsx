/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {StyleSheet, View} from 'react-native';
import {vh, vw} from './services/styleSheet';
import Home from './views/bottomNavigator/Home';
import {
  chartIcon,
  homeIcon,
  profileIcon,
  stockIcon,
  stocklineIcon,
  tradeIcon,
} from './assets/svgXML';
import Chart from './views/bottomNavigator/Chart';
import Trade from './views/bottomNavigator/Trade';
import Stock from './views/bottomNavigator/Stock';
import Profile from './views/bottomNavigator/Profile';
import Watchlist from './views/bottomNavigator/Watchlist';
import Onboarding from './views/init/Onboarding';
import SignUp from './views/account/SignUp';
import Login from './views/account/Login';
import PhoneVerify from './views/init/PhoneVerify';
import Welcome from './views/init/Welcome';
import ChartInfor from './views/chart/ChartInfor';
import BuyingVerify from './views/chart/BuyingVerify';
import OtpVerify from './views/init/OtpVerify';
import PasswordModifying from './views/init/PasswordModifying';
import Search from './views/market/Search';
import Alerts from './views/market/Alerts';
import Insights from './views/market/Insights';
import TopMovers from './views/market/TopMovers';
import Account from './views/profile/Account';
import Security from './views/profile/Security';
import Language from './views/profile/Language';
import Settings from './views/profile/Settings';
import FAQ from './views/profile/FAQ';
import Automate from './views/automation/Automate';
import RecurringEdit from './views/automation/RecurringEdit';
import RecurringDetail from './views/automation/RecurringDetail';
import RiskRules from './views/automation/RiskRules';
import BotEdit from './views/automation/BotEdit';
import {LanguageProvider} from './services/i18n';
import {SessionProvider, useSession} from './services/session';
import {UserDataProvider} from './services/userData';
import {AutomationProvider} from './services/automation';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <View style={styles.tabnavigationStyle}>
      <Tab.Navigator
        id="MainTabs"
        initialRouteName="Home"
        screenOptions={({route}) => ({
          tabBarActiveTintColor: '#FFED4B',
          tabBarShowLabel: false,
          tabBarButtonTestID: `tab-${route.name}`,
          tabBarStyle: {
            borderTopColor: '#1A1A1A',
            backgroundColor: '#1A1A1A',
            height: vh(9),
          },
        })}>
        <Tab.Screen
          name="Home"
          component={Home}
          options={{
            headerShown: false,
            tabBarIcon: ({color, focused}) => {
              const iconSize = focused ? vw(7) : vw(6);
              return (
                <View style={[styles.iconContainer]}>
                  {homeIcon(iconSize, iconSize, color)}
                </View>
              );
            },
          }}
        />
        <Tab.Screen
          name="Chart"
          component={Chart}
          options={{
            headerShown: false,
            tabBarIcon: ({color, focused}) => {
              const iconSize = focused ? vw(7) : vw(6);
              return (
                <View style={[styles.iconContainer]}>
                  {chartIcon(iconSize, iconSize, color)}
                </View>
              );
            },
          }}
        />
        <Tab.Screen
          name="Trade"
          component={Trade}
          options={{
            headerShown: false,
            tabBarIcon: ({focused}) => {
              const iconSize = focused ? vw(7) : vw(6);
              return (
                <View style={[styles.iconContainer, styles.focusedIcon]}>
                  {tradeIcon(iconSize, iconSize, '#1A1A1A')}
                </View>
              );
            },
          }}
        />
        <Tab.Screen
          name="Stock"
          component={Stock}
          options={{
            headerShown: false,
            tabBarIcon: ({color, focused}) => {
              const iconSize = focused ? vw(7) : vw(6);
              return (
                <View style={[styles.iconContainer]}>
                  {stockIcon(iconSize, iconSize, color)}
                </View>
              );
            },
          }}
        />
        <Tab.Screen
          name="Profile"
          component={Profile}
          options={{
            headerShown: false,
            tabBarIcon: ({color, focused}) => {
              const iconSize = focused ? vw(7) : vw(6);
              return (
                <View style={[styles.iconContainer]}>
                  {profileIcon(iconSize, iconSize, color)}
                </View>
              );
            },
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const RootNavigator = () => {
  const {ready, user} = useSession();

  // Hold a plain splash until the saved session is read, so a logged-in
  // user lands on Main instead of flashing through onboarding.
  if (!ready) {
    return <View style={styles.splash}>{stocklineIcon(vw(20), vw(20))}</View>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        id="RootStack"
        initialRouteName={user ? 'Main' : 'Onboarding'}
        // Every screen has a dark background, so keep status bar icons light.
        screenOptions={{headerShown: false, statusBarStyle: 'light'}}>
        <Stack.Screen name="Main" component={TabNavigator} />
        {/* Market */}
        <Stack.Screen name="ChartInfor" component={ChartInfor} />
        <Stack.Screen name="BuyingVerify" component={BuyingVerify} />
        <Stack.Screen name="Search" component={Search} />
        <Stack.Screen name="Alerts" component={Alerts} />
        <Stack.Screen name="Insights" component={Insights} />
        <Stack.Screen name="TopMovers" component={TopMovers} />
        <Stack.Screen name="Watchlist" component={Watchlist} />
        {/* Automation */}
        <Stack.Screen name="Automate" component={Automate} />
        <Stack.Screen name="RecurringEdit" component={RecurringEdit} />
        <Stack.Screen name="RecurringDetail" component={RecurringDetail} />
        <Stack.Screen name="RiskRules" component={RiskRules} />
        <Stack.Screen name="BotEdit" component={BotEdit} />
        {/* Profile */}
        <Stack.Screen name="Account" component={Account} />
        <Stack.Screen name="Security" component={Security} />
        <Stack.Screen name="Language" component={Language} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="FAQ" component={FAQ} />
        {/* Init */}
        <Stack.Screen name="Onboarding" component={Onboarding} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="PasswordModifying" component={PasswordModifying} />
        <Stack.Screen name="PhoneVerify" component={PhoneVerify} />
        <Stack.Screen name="OtpVerify" component={OtpVerify} />
        <Stack.Screen name="Welcome" component={Welcome} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => (
  <LanguageProvider>
    <SessionProvider>
      <UserDataProvider>
        <AutomationProvider>
          <RootNavigator />
        </AutomationProvider>
      </UserDataProvider>
    </SessionProvider>
  </LanguageProvider>
);

export default App;

const styles = StyleSheet.create({
  tabnavigationStyle: {backgroundColor: '#1A1A1A', flex: 1},
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusedIcon: {
    backgroundColor: '#FFED4B',
    borderRadius: vw(8), // Adjust the radius to make it a circle
    padding: vw(4), // Adjust the padding to control the size of the circle
  },
  splash: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
