# 4chan Sounds Player

A floating player for 4chan sounds threads. 

[Click here to install](https://raw.githubusercontent.com/rcc11/4chan-sounds-player/master/dist/4chan-sounds-player.user.js).

## Sound Player UI

A link to open the player is shown at the top and bottom of the page, next to settings.

![Playlist UI](./images/button-native.png)

#### With 4chan X

Elements of the display, such as icons, are dependent on having 4chan X installed, but it's not a requirement. The icons will fall back to text displays and everything else is purely cosmetic. With it installed the button to open the player is included in the header.

![Playlist UI](./images/button-4chan-x.png)

#### Position/Resizing

The player can be moved by dragging the header and resized by dragging bottom right corner of the footer.

#### Adding Local Files

To add local files (images with `[sound=url]` filenames) you can either click the + button in the header and select the files you want or drag and drop files onto the player.

If you want to test out a sound before you post it this is a good method of doing so.

#### Display Modes

The playlist view will list all the sounds in the thread in the order they're playing, with the ability to drag items to modify the order. When hovering over an item the dropdown menu button will show on the right. The menu has an option to remove the item and links to post, image and sound file.

![Playlist UI](./images/playlist.png)

The image only view hides the playlist allowing the image to be expanded.

![Playlist UI](./images/green-tea.png)

## Sound Threads Search

The threads views allows you to search for threads that include a sound in the OP. You can select which boards to search and a search term to filter by.

The threads can be displayed in a table or a pseudo-board.

![Playlist UI](./images/threads-board.png)
![Playlist UI](./images/threads-table.png)


## Settings

- __Allowed Hosts__ - Which hosts the player will add sounds from.
- __Autoshow__ - Open the player automatically for threads that contain sounds.
- __Colors__ - By default the player will attempt to match the board theme, but you can set your own colors. Selecting "Match Theme" will revert to matching the board theme after making any modifications.
- __Filters__ - Sounds or images to ignore. On each line add the URL of the sound or the MD5 of the image you want to filter and they will no longer be added to the player. Lines starting with a `#` are ignored. The menu for playlist items has links to add the sound or image to the filters.
- __Footer/Header/Row Contents__ - Custom display templates. See "Content Templates" below.
- __Keybinds__ - Keyboard shortcuts can be assigned to control the player and playback. They can be always enabled, enabled only when the player is open, or disabled.
- __Limit Post Width__ - Reduces the widths of posts that are next to the player so they're not hidden beneath it.
- __Threads View Display__ - How the threads in the thread view are displayed.
- __Pause on hide__ - Pauses the player when it's hidden.

## Content Templates

Certain sections of the UI allow you to provide custom HTML templates. In doing so the replacements below will be made to the provided template.

For the templates other than the row template, values that refer to a sound reference whichever is currently selected (playing/paused). So `p:{}` in the footer template will show the content if any sound is selected, whereas `p:{}` in the row template will show the content for only the row that is currently selected.

For both `p:{}` and `h:{}` the content given will have the same replacements applied. So, for example, you can choose to only show the menu button when hovering over a row by adding `h:{ menubutton }` to the row template.

__Conditional Display__
- `p:{ <content> }` - Only displays the given content if the sound is currently selected.
- `h:{ <content> }` - Only displays the given content if the cursor is hovering over the element (i.e. the footer or row). Note that unlike `p:{}` that fully omits the contents this will instead wrap it in a containing div. If that messes up your template you can set a class of `fc-sounds-hover-display` on elements to achieve the same effect instead.

__Sound Properties__
- `sound-count` - The number of songs added to the player.
- `sound-index` - The index of the sound (starting from 1).
- `sound-name` - The name of the sound.

__Links/Buttons__

All the values here can be followed by `:""` to specify the text, otherwise they will default to icons with 4chan X or short text displays.
- `playing-link` - Jumps to the sound in the playlist.
- `post-link` - Jumps to the post for the sound.
- `image-link` - Opens the sounds image in a new tab.
- `sound-link` - Opens the sounds source in a new tab.
- `dl-image-button` - Download the sounds image with the original filename, i.e including `[sound=url]`.
- `dl-sound-button` - Download the sound audio itself.
- `repeat-button` - Toggles the repeat setting between all, one and none.
- `shuffle-button` - Toggles shuffle.
- `playlist-button` - Toggles between the playlist and image view.
- `hover-images-button` - Toggles hover images in the playlist.
- `add-button` - Open the file input to add local files.
- `reload-button` - Reloads the sounds from the thread to add any missing files. Useful if you change the allowed hosts or filters but generally all sounds should already be added.
- `settings-button` - Open/close the settings.
- `close-button` - Hide the player.
- `menu-button` - Open the dropdown menu for the sound.