//
//  DBUtils.swift
//  watch
//
//  Created by Konstantin Späth on 10.06.24.
//

import Foundation
import SwiftData

func addDownloadData(_ modelContext: ModelContext, id: String, title: String?, downloaded: Bool? = nil, fileURL: String? = nil) {
  
  do {
    let descriptor = FetchDescriptor<Video>(
          predicate: #Predicate { $0.id == id }
        )
    let contents = try modelContext.fetch(descriptor)
    
    if(!contents.isEmpty) {
      
    } else {
      let video = Video(id: id, title: title, downloaded: downloaded ?? false)
      
      if let fURL = fileURL {
        video.fileURL = fURL
      }
      
      modelContext.insert(video)
    }
    
    
  } catch {
    print("Error inserting Download Data: \(error)")
  }
}
