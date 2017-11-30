# r-place-canvas-tool

This tool allows recreation of any [/r/place](https://www.reddit.com/r/place) canvas state.
It is similar to [Pietro Albini's tool](https://github.com/pietroalbini/reddit-place-2017)
in that both tools produce renderings of given areas of the canvas at a given time.
Here are some noteworthy differences about this one:

* It is graphical and interactive (intended for exploration)
* It does not include the tile placement data (must be downloaded separately)
* It is built with [`electron`](https://electronjs.org/) rather than Python.
  This allows installation/use without any special environment.
* It has full pixel-by-pixel resolution instead of being limited to groupings of 5s
* It uses  makes inefficient use of space
  (In order to improve speed/responsiveness, it saves complete "snapshots" of the canvas
  at intervals, e.g. every 20,000 tile placements, similarly to how video encoders may save keyframes or how backup systems save full and incremental backups.)

After writing most of this program I discovered [Phil Gold](https://github.com/asciiphil)'s
at [place.aperiodic.net](http://place.aperiodic.net/zoom/#0/-500/500),
which also can generate [user statistics & vizualizations](http://place.aperiodic.net).

--------------------
(Boilerplate for building / developing follows) 

## Prerequisites

You will need the following things properly installed on your computer.

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) (with npm)
* [Ember CLI](https://ember-cli.com/)

## Installation

* `git clone https://github.com/jacobq/r-place-canvas-tool`
* `cd r-place-canvas-tool`
* `npm install`

## Running / Development

* `ember electron`      # run development build
* `ember electron:make` # create installer(s) for your OS

Refer to the [`ember-electron`](https://ember-electron.js.org/) docs for more options & information

## Further Reading / Useful Links

* [ember.js](https://emberjs.com/)
* [ember-cli](https://ember-cli.com/)
* Development Browser Extensions
  * [ember inspector for chrome](https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi)
  * [ember inspector for firefox](https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/)
