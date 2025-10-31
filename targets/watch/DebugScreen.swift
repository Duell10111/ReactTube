//
//  DebugScreen.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 12.09.25.
//

import SwiftUI

struct DebugScreen: View {
    var body: some View {
      Text("Downloads: \(DownloadManager.shared.activeDownloads.count)")
      Text("Pending Downloads \(DownloadManager.shared.pendingDownloads.count)")
    }
}

#Preview {
    DebugScreen()
}
