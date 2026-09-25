# Phase 4: Player and video detail

Phase 4 rebuilds the path the app exists for: open a video, see what it is,
act on it, go back. Phone and tablet share one detail screen, TV keeps its own
player but gets the same metadata, the same actions, and the same states.

## One screen for phone and tablet

`src/screens/phone/VideoDetailScreen.tsx` replaces `VideoScreenPhone` and
`VideoScreenTablet`. The two differed in more than their layout — the tablet
screen carried a dead `VerticalVideoList` branch, its own orientation state,
and two copies of the playlist sheet — while both rendered the same metadata
block through the same component.

The arrangement now comes from `videoDetailLayout.ts`, a pure module:

| Input                     | Mode      | Panels | Metadata          |
| ------------------------- | --------- | ------ | ----------------- |
| any touch size, portrait  | `stacked` | sheet  | above the feed    |
| any touch size, landscape | `split`   | sheet  | beside the player |
| TV                        | `tv`      | side   | in the overlay    |

Landscape is the trigger for the split, not the device class. A phone in
landscape has the tablet's problem: a 16:9 player plus a vertical feed below it
leaves neither of them a usable height. The phone keeps a slightly wider player
column than the tablet and drops the description preview — `reducedChrome` —
because roughly 390 points of height have to be spent on the video.

The player keeps 16:9 in every mode and derives its height from its own column,
so the fixed `height: 270` and the `height * 0.5` guesses are gone.

## Metadata hierarchy and action bar

`videoDetailModel.ts` is the second pure module. It turns a `YTVideoInfo` into
the typed view a surface renders: title, the metadata parts, the channel, the
queue position, and the list of actions that surface can actually carry out.

- Downloads only exist on touch, so `canDownload` decides whether the action is
  in the bar at all instead of rendering a button that warns when pressed.
- The rating comes from the action endpoint when it has one and from the video
  info otherwise, because the endpoint leads the info after a like.
- A playlist that reports an index outside its own content — YouTube does — is
  clamped, so the queue never reads "0 of 24".

`VideoDetailHeader` renders that view in the order the plan asks for: title,
views and date, creator with subscribe, then `ActionBar`. Every action carries
an icon **and** a text label; the previous two raised `like`/`dislike` circles
and one "Save" pill were neither labelled consistently nor reachable by a
screen reader. The bar scrolls instead of dropping what does not fit.

Subscribe is optimistic and owned by the screen: the button is the only
feedback the request has, and it reverts when the request fails. Before, the
state was toggled twice per press and never reverted.

## Description, comments, and queue

All three open in `SheetPanel`, one themed sheet with a title row and a close
action, so they cannot look like three different products. Playback keeps
running behind them, which is the reason they are sheets and not screens.

Comments were three empty placeholders — `CommentsList` and
`CommentListElement` returned `<></>`, and `useComments` fetched and discarded.
Those are gone; comments now exist:

- `src/extraction/CommentExtraction.ts` flattens a comment thread into
  `YTComment`; the two unused placeholder types it replaces are gone.
- `useVideoComments` loads them **lazily** — nothing is requested until a panel
  asks for it — and reports loading, error, continuation, and the total.
- `CommentList` owns skeletons, the empty state, the error state with retry,
  and the footer loader. Phone sheet and TV panel render the same component.

`MediaRow` is new: a denser row with the thumbnail beside the text. The queue
uses it and opens on the entry that is playing, because a queue is read from
the current position. It replaces the floating "Next Video" pill, which showed
one entry and no position.

## Feed and states

Up next now renders through `MediaFeed` from Phase 3, so the video detail is
no longer the last surface with its own card and its own grid. Its loading,
empty, and pagination states come with it.

`useFeedGeometry` now takes the column count from the width the feed actually
occupies instead of from the window. Up next beside a player is a third of the
screen wide; judged by the window it was an "expanded" feed and rendered three
columns of cards into that third. The measured width was already used for the
card width — it now decides the column count too, and TV keeps its own class
because its content plane is translated, never resized.

The states around the player are real states now:

- `useVideoDetails` reports `loading` and `error`. A failed metadata request
  used to end in `LOGGER.warn`, leaving the screen on an endless spinner with
  no difference between "still loading" and "never arriving".
- Initial load renders `VideoDetailSkeleton` in the player's real proportions
  instead of a centred `ActivityIndicator`.
- A video without a playable source shows `ErrorState` with the playability
  reason and a retry that re-requests it, instead of unstyled error text.

## TV player

The overlay keeps its structure and loses its hard-coded colours:

- `MetadataContainer` uses the type scale and semantic colours, joins the
  metadata with the same separator every other surface uses, and labels every
  control for VoiceOver — the buttons had no accessible names at all.
- `MetadataButton` focus is an outline plus a filled surface, the pair the TV
  media card uses.
- `Seekbar` fills in `mediaProgress`, the colour watch progress uses on cards,
  and grows its handle on focus unless Reduced Motion is on.
- `EndCard` and `VideoEndCard` use the shared scrim and text roles, and the
  end screen's metadata line comes from the same helper as the detail view.

The controls hide themselves again, and with them the bottom panel.

`useControlTimeout` held the timer in two effects. Every caller restarts it as
a pair — `resetControlTimeout()` then `setControlTimeout()` — and both landed
in the same render. The two effects then ran in order in that one commit: the
first armed a fresh timer, the second cleared it and armed nothing. After the
first press on the remote the controls stayed on screen for the rest of the
video, and the related videos panel with them, because the panel is lowered
200 ms after the controls go away. Arming and clearing are now one piece of
state owned by one effect, so the last call in a batch decides and a restart
cannot cancel itself. The timer also reads the current hide through a ref
instead of the closure it was armed with, which was stale by the time it fired.

The panel is raised when focus enters it and was lowered by exactly one event:
focus on the seek handle. Reaching the action buttons from the related videos
left it up. Every control above the panel now reports focus, and the timer that
lowers it after the controls fade is cleared when they come back.

`VideoSidePanel` is the new interaction panel: it takes the right third of the
screen and leaves the video playing beside it — on a TV, reading the
description must not mean leaving the video. It carries details, comments, and
the queue as tabs, and traps focus while it is open, so the D-pad cannot land
on a player control hidden behind it. The "info" button in the player overlay
opens it.

## Deliberate deviations

- The phone player still uses the platform's own video controls
  (`react-native-video` with `controls`), so its transport bar is not themed.
  Replacing it with the custom overlay is a playback change, not a UI one, and
  the plan keeps playback out of this phase.
- Comments are read-only. Posting, replying, sorting, and liking a comment are
  reachable through youtubei.js but are new functionality, not a redesign.
- A comment's replies are not loaded. The reply count is shown; opening a
  thread waits until there is a surface for it.
- `VideoMetadataContainer`, `SubscribeButton`, the video `PlayerActionButton`,
  `PlaylistBottomSheet`, `PlaylistBottomSheetContainer`, `VerticalVideoList`,
  and `VideoInfo` have no users left. The plan removes unused components in
  Phase 8, so they stay in the tree until then.
- Reels keep their own screen. `ReelVideoScreen` is a full-screen format with
  its own gestures and is listed for a later phase.

## Verification

- `npm test` covers the layout decision, the player height, the view model's
  metadata, actions, rating precedence and queue clamping, and the comment
  model in English and German — 55 tests total.
- `npm run lint`, `npm run typecheck`, and `npx prettier --check` are clean for
  the changed files.

### Manual checks

Not automatable in this project yet, so they are part of the review:

1. Phone portrait: open a video, scroll up next, open each of the three
   sheets, and confirm the video keeps playing behind them.
2. Rotate to landscape and back during playback: the layout switches between
   stacked and split without the video restarting.
3. Picture in picture on iOS: leaving the screen enters PiP, returning resumes.
4. Resume: reopen a partly watched video and confirm it starts at the stored
   position.
5. Tablet portrait and landscape: the split column ratio holds and up next
   keeps its own column.
6. A video in a playlist: the queue sheet opens on the entry that is playing.
7. TV: open the side panel from the info button, move through its tabs with the
   D-pad, confirm focus cannot leave the panel, and close it with the close
   action — the video plays throughout.
8. TV with Reduced Motion: the seek handle stays visible through its outline.
9. Offline: the detail screen shows the error state with a working retry.
