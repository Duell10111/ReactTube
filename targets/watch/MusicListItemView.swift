//
//  MusicListItemView.swift
//  RT-Watch
//
//  Created by Konstantin Späth on 04.02.25.
//

import SwiftUI

let videoDownloadProgressFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.minimumIntegerDigits = 1
        formatter.maximumIntegerDigits = 3
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        return formatter
}()

struct MusicListItemView: View {
    @Environment(DownloadManager.self) private var downloadManager: DownloadManager
    var video: Video
    var clicked: () -> Void
  
    var body: some View {
      Button {
        clicked()
      } label: {
        VStack {
          HStack {
            Text(video.title ?? "Unknown title")
              .foregroundStyle(video.downloaded == true ? .blue : .primary)
            if let validUntil = video.validUntil, validUntil < Date() && video.downloaded != true {
              Spacer()
              Image(systemName: "clock.badge.exclamationmark")
                .foregroundColor(.red)
            }
          }
          if video.downloaded {
            HStack {
              Label("Downloaded", systemImage: "arrow.down.circle")
            }
          }
          if let videoDownload = downloadManager.progressDownloads[video.id] {
            ProgressView(value: videoDownload)  {
              Text("\(videoDownloadProgressFormatter.string(from: NSNumber(value: videoDownload)) ?? String(videoDownload)) progress")
                .font(.system(size: 12))
            }
          }
        }
      }.swipeActions {
        Button {
          DownloadManager.shared.downloadVideo(video: video)
        } label: {
          Label("Download", systemImage: "arrow.down")
        }
        .tint(.blue)
      }
    }
}

#Preview {
  MusicListItemView(video: Video(id: "test", durationMillis: 1000)) {
    print("Clicked")
  }
}
