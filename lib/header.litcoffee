
	if exports?
		SmackboneLive = exports
		Smackbone = require 'smackbone'
	else
		SmackboneLive = this.SmackboneLive = {}
		Smackbone = this.Smackbone
