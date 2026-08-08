import { Platform, PermissionsAndroid, NativeModules } from 'react-native';

// Only import when the native module actually exists
let RNCallKeep: any = null;
let IOptions: any = null;

if (Platform.OS !== 'web' && NativeModules.RNCallKeep) {
    // dynamic require so the top-level import doesn’t crash
    const callkeep = require('react-native-callkeep');
    RNCallKeep = callkeep.default;
    IOptions = callkeep.IOptions;
}

const options = {
    ios: {
        appName: 'Kokohor',
        supportsVideo: false,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '1',
    },
    android: {
        alertTitle: 'Permissions required',
        alertDescription:
            'Kokohor needs access to your phone account to show incoming family calls.',
        cancelButton: 'Cancel',
        okButton: 'OK',
        imageName: 'phone_account_icon',
        additionalPermissions: [],
        foregroundService: {
            channelId: 'com.kokohor.app.call',
            channelName: 'Calls',
            notificationTitle: 'Call in progress',
        },
    },
};

export const setupCallKeep = async () => {
    if (!RNCallKeep) {
        console.warn('CallKeep native module not available (Expo Go / web / missing build)');
        return;
    }

    try {
        await RNCallKeep.setup(options);
        RNCallKeep.setAvailable(true);

        if (Platform.OS === 'android') {
            RNCallKeep.registerPhoneAccount(options);
        }

        console.log('✅ CallKeep setup completed');
    } catch (err) {
        console.error('❌ CallKeep setup error:', err);
    }
};

export const displayIncomingCall = (
    uuid: string,
    callerName: string,
    handle = callerName
) => {
    if (!RNCallKeep) return;
    RNCallKeep.displayIncomingCall(uuid, handle, callerName, 'generic', false);
};

export const endCallKeep = (uuid: string) => {
    if (!RNCallKeep) return;
    RNCallKeep.endCall(uuid);
};

export const endAllCalls = () => {
    if (!RNCallKeep) return;
    RNCallKeep.endAllCalls();
};