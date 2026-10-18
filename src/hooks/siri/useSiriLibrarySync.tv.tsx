// Siri is excluded from TV builds. Without this file Metro would pick
// useSiriLibrarySync.ios.tsx on tvOS, whose database hooks the TV variant of
// DownloadDatabaseOperations does not provide.
export default function useSiriLibrarySync() {}
