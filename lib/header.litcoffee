
	if exports?
		console.log 'exports is here'
		SmackboneLive = exports
		Smackbone = require 'smackbone_live'
	else
		console.log 'exports is not'
		console.log 'root', this
		SmackboneLive = this.SmackboneLive = {}
		Smackbone = this.Smackbone
