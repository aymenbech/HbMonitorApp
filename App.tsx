// App.tsx

import React from 'react';
import {StatusBar} from 'react-native';
import {AppProviders} from './src/app/AppProviders';
import {RootNavigator} from './src/navigation/RootNavigator';
import {colors} from './src/theme/colors';

function App(): React.JSX.Element {
  return (
    <AppProviders>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <RootNavigator />
    </AppProviders>
  );
}

export default App;