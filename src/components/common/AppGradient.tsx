import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

// Ultra-smooth 3-stop Royal Purple (#7C3AED) -> Vivid Orchid/Magenta (#C026D3) -> Hot Rose Pink (#EC4899) linear gradient
export const PURPLE_PINK_GRADIENT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAQCAYAAAD506FJAAACPElEQVR42u3UVUJbURQFUEYDgRBcgrSlpZQOirpSdxrc3S24EyC4uxMkoWPYzT3vlDH0Y3+sKayQnNQ/yEm5xiP1WATwxHAG8FQ9c/rFcyPZjxdBL5OvxCv12ki6xBv1VuUmXSA38QLv1PugD4nn4mOC5ZPw4bP6YsT78DX+THxT34N+xJ2Kn+qXOEGeEXuC3+IYLpVvxByjIOYIhapIFUcfihJVKg5QZkQdoFxVRO2jUlU5LNWOPVGjaiONXdSpetUQuYNGu6VJNdu3RUuEpVVsoU21G+Gb6AjqVF1iA902i1v12NZFb5ilT6yhP2hADYYaqxhSw2okdEUtY9QIWxJjhm1RjNsWLOHzmBBzmDQiZoVHeOGxezFln7FETmNaTIkZh+eG1zEJb5QxgVkxjtnoccxFj1liRjF/YwQLscYwFsUQFuOGsBQ3qAawHP9PP1YSjD6xmtCL1USjB2vCjbUkN9ZFt9hI7lKd2HQaHWLL2Y6tlHZsizaxk9qqWrBrpDWLvbQm7KVb9tMbLbcacCDqxeHtOlWLI+OOUYNjI6NanGRUidO7laoCZ8Y9oxw+UQZfZhnOM0st90twIYrFZZZRJK6yCnH1wCiAX+TDn52PQLZLXD90IYQBMAAGwAAYAANgAAyAATAABsAAGAADYAAMgAEwAAbAABgAA2AADIABMAAGwAAYAANgAAyAATAABsAAGAADYAAMgAEwAAbAABgAA2AADIABMAAGwAAYAANgAAyAATAABvC/BvAXcC5jVrgjfkQAAAAASUVORK5CYII=';

export interface AppGradientProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AppGradient({ style, children, ...rest }: AppGradientProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <Image
        source={{ uri: PURPLE_PINK_GRADIENT }}
        style={StyleSheet.absoluteFill}
        resizeMode="stretch"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
});

export default AppGradient;
