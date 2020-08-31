import * as CORE from '../core/Core.js';

class UICoinsCount extends CORE.UIComponent {
	constructor(hero) {
		super();
		this.hero = hero;
		this.currentValue = null;
	}

	onInitialize() {
		this.collector = this.hero.getComponent(Collector);
	}

	onUpdate() {
		if (this.currentValue !== this.collector.coinsCount) {
			this.uiObject.setInnerText(`${this.collector.coinsCount}`);
			this.currentValue = this.collector.coinsCount;
		}
	}
}

class UILifeCount extends CORE.UIComponent {
	constructor(hero) {
		super();
		this.hero = hero;
		this.currentValue = null;
	}

	onInitialize() {
		this.player = this.hero.getComponent(Player);
	}

	onUpdate() {
		if (this.currentValue !== this.player.lifeCount) {
			this.uiObject.setInnerText(`${this.player.lifeCount}`);
			this.currentValue = this.player.lifeCount;
		}
	}
}

class Rotater extends CORE.GameComponent {
	constructor(speed) {
		super();
		this.speed = speed;
	}
	
	onInitialize() {
		/**
		 * @type {CORE.RigidBody}
		 */
		this.rigidBody = this.gameObject.getComponent(CORE.RigidBody);
		if (this.rigidBody == null) {
			throw new Error('no rigid body.');
		}
	}

	onUpdate(delta) {
		if (this.rigidBody.velocity.x > 0 || this.rigidBody.velocity.x < 0) {
			this.transform.setRotation(
				this.transform.rotation + (this.rigidBody.velocity.x / Math.PI) * this.speed * delta,
			);
		}
		if (this.transform.position.y < -5) {
			this.gameObject.destroy();
		}
	}
}

class InteractingObject extends CORE.GameComponent {
	interact(gameObject) {

	}
}

class Player extends CORE.GameComponent {
	constructor(lifeCount, maxHungryCount) {
		super();
		this.lifeCount = lifeCount;
		this.maxHungryCount = maxHungryCount;
		this.hungryCount = maxHungryCount;
		this.interactingObject = null;
	}

	increaseHunger() {
		this.hungryCount--;
		console.log('hunger: ' + this.hungryCount);
		if (this.hungryCount <= 0) {
			console.log('lose');
			this.gameObject.scene.reload();
		}
	}

	decreaseHunger(levelOfSatiety) {
		this.hungryCount += levelOfSatiety;
		if (this.hungryCount >= this.maxHungryCount) {
			this.hungryCount = this.maxHungryCount;
		}
		console.log('hunger: ' + this.hungryCount);
	}

	onUpdate() {
		if (!this.controller.isFreeze) {
			if (CORE.Input.getKeyDown('KeyE') && this.interactingObject != null) {
				this.interactingObject.interact(this.gameObject);
			}
		}
	}

	onInitialize() {
		/**
		 * @type {CORE.RigidBody}
		 */
		this.rigidBody = this.gameObject.getComponent(CORE.RigidBody);
		if (this.rigidBody == null) {
			throw new Error('no rigid body.');
		}
		/**
		 * @type {Controller}
		 */
		this.controller = this.gameObject.getComponent(Controller);
		if (this.controller == null) {
			throw new Error('no controller.');
		}
	}

	onCollisionEnter(collider) {
		if (collider.gameObject.name === 'spike') {
			this.lifeCount--;
			console.log('lives left: ' + this.lifeCount);
			if (this.lifeCount <= 0) {
				console.log('lose');
				this.gameObject.scene.reload();
			} else {
				this.controller.freeze();
				this.rigidBody.setVelocity(new CORE.Vector2d(0, 0));
				if (this.transform.position.x <= collider.transform.position.x) {
					this.rigidBody.addForce(new CORE.Vector2d(-75, 800));
				} else {
					this.rigidBody.addForce(new CORE.Vector2d(75, 800));
				}
			}
		}
	}

	onTriggerExit(collider) {
		if (this.interactingObject != null && collider.gameObject === this.interactingObject.gameObject) {
			this.interactingObject = null;
		}
	}
}

class Controller extends CORE.GameComponent {
	onInitialize() {
		/**
		 * @type {CORE.RigidBody}
		 */
		this.rigidBody = this.gameObject.getComponent(CORE.RigidBody);
		if (this.rigidBody == null) {
			throw new Error('no rigid body.');
		}
		/**
		 * @type {Player}
		 */
		this.player = this.gameObject.getComponent(Player);
		if (this.player == null) {
			throw new Error('no player.');
		}
		this.isFreeze = false;
		/**
		 * @type {CORE.Animator}
		 */
		this.animator = this.gameObject.getComponent(CORE.Animator);
		if (this.animator == null) {
			throw new Error('no animator.');
		}
		this.state = 'idle';
	}

	changeState(state) {
		if (this.state === state) {
			return;
		}
		this.animator.play(state);
		this.state = state;
	}

	freeze() {
		if (!this.canJump) {
			this.isFreeze = true;
		}
	}

	onCollisionEnter(collider) {
		if (collider.gameObject.name === 'platform' || collider.gameObject.name === 'roof') {
			this.canJump = true;
			this.isFreeze = false;
		}
	}

	onCollisionExit(collider) {
		if (
			collider.gameObject.name === 'platform' 
			&& this.gameObject.getComponent(CORE.Collider).collidersInContact.size === 1
		) {
			this.canJump = false;
		}
	}

	onTriggerEnter(collider) {
		if (collider.gameObject.name === 'ladders') {
			this.isLadder = true;
			this.rigidBody.setKinematic(true);
		}
	}

	onTriggerExit(collider) {
		if (collider.gameObject.name === 'ladders') {
			this.isLadder = false;
			this.rigidBody.setKinematic(false);
		}
	}

	onFixedUpdate(delta) {
		if (this.freezeTime > 0) {
			this.freezeTime -= delta;
		}
	}

	onUpdate() {
		const follower = this.gameObject.scene.camera.getComponent(Follower);
		follower.isLookDown = false;
		if (this.isLadder) {
			if (CORE.Input.getKeyPressed('KeyW') || CORE.Input.getKeyPressed('ArrowUp')) {
				this.rigidBody.setVelocity(new CORE.Vector2d(this.rigidBody.velocity.x, 3));
			} else if (CORE.Input.getKeyPressed('KeyS') || CORE.Input.getKeyPressed('ArrowDown')) {
				this.rigidBody.setVelocity(new CORE.Vector2d(this.rigidBody.velocity.x, -3));
			} else {
				this.rigidBody.setVelocity(new CORE.Vector2d(this.rigidBody.velocity.x, 0));
			}
			if (CORE.Input.getKeyPressed('KeyA') || CORE.Input.getKeyPressed('ArrowLeft')) {
				this.rigidBody.setVelocity(new CORE.Vector2d(-3, this.rigidBody.velocity.y));
				this.transform.setLocalScale(new CORE.Vector2d(-0.8, 0.8));
				this.changeState('walk');
			} else if (CORE.Input.getKeyPressed('KeyD') || CORE.Input.getKeyPressed('ArrowRight')) {
				this.rigidBody.setVelocity(new CORE.Vector2d(3, this.rigidBody.velocity.y));
				this.transform.setLocalScale(new CORE.Vector2d(0.8, 0.8));
				this.changeState('walk');
			} else {
				this.rigidBody.setVelocity(new CORE.Vector2d(0, this.rigidBody.velocity.y));
				this.changeState('idle');
			}
		} else {
			if (CORE.Input.getKeyPressed('KeyA') || CORE.Input.getKeyPressed('ArrowLeft')) {
				this.rigidBody.setVelocity(new CORE.Vector2d(-5, this.rigidBody.velocity.y));
				this.transform.setLocalScale(new CORE.Vector2d(-0.8, 0.8));
				this.changeState('walk');
			} else if (CORE.Input.getKeyPressed('KeyD') || CORE.Input.getKeyPressed('ArrowRight')) {
				this.rigidBody.setVelocity(new CORE.Vector2d(5, this.rigidBody.velocity.y));
				this.transform.setLocalScale(new CORE.Vector2d(0.8, 0.8));
				this.changeState('walk');
			} else {
				follower.isLookDown = CORE.Input.getKeyPressed('KeyS') || CORE.Input.getKeyPressed('ArrowDown');
				this.rigidBody.setVelocity(new CORE.Vector2d(0, this.rigidBody.velocity.y));
				this.changeState('idle');
			}
			if (CORE.Input.getKeyDown('Space') || CORE.Input.getKeyDown('ArrowUp')) {
				this.rigidBody.addForce(new CORE.Vector2d(0, 700));
			}
		}
		if (this.transform.position.y < -6) {
			this.gameObject.scene.reload();
		}
	}
}

class Follower extends CORE.CameraComponent {
	constructor(target) {
		super();
		this.target = target;
		this.floor = 1.5;
		this.isLookDown = false;
	}
	
	setFloor(y) {
		this.floor = y;
	}

	onUpdate() {
		let position = this.target.transform.position;
		position = new CORE.Vector2d(position.x, position.y + 1.2);
		if (this.isLookDown) {
			position = position.subtract(new CORE.Vector2d(0, 2));
		}

		if (position.y < this.floor) {
			position = new CORE.Vector2d(position.x, this.floor);
		}
		if (position.x < -40) {
			position = new CORE.Vector2d(-40, position.y);
		}
		this.transform.setPosition(position);
	}
}

class Collector extends CORE.GameComponent {
	constructor() {
		super();
		this.coinsCount = 0;
	}

	onTriggerEnter(collider) {
		if (collider.gameObject.name === 'coin') {
			this.coinsCount++;
			console.log('coins: ' + this.coinsCount + ' / 5');
			collider.gameObject.destroy();
		}
	}
}

class Mover extends CORE.GameComponent {
	constructor(speed, left, right) {
		super();
		this.speed = speed;
		this.left = left;
		this.right = right;
		this.target = left;
	}

	onInitialize() {
		/**
		 * @type {CORE.RigidBody}
		 */
		this.rigidBody = this.gameObject.getComponent(CORE.RigidBody);
		if (this.rigidBody == null) {
			throw new Error('no rigid body.');
		}
	}

	onFixedUpdate(delta) {
		if (this.transform.position.equals(this.target)) {
			if (this.target.equals(this.left)) {
				this.target = this.right;
			} else {
				this.target = this.left;
			}
		}
		this.rigidBody.moveTo(this.target, this.speed, delta);
	}
}

export default class Level1 extends CORE.Scene {
	onInitialize() {
		this.resources.addTextureInLoadQueue('ball', 'resources/ball.png');
		this.resources.addTextureInLoadQueue('coin', 'resources/coin.png');
		this.resources.addTextureInLoadQueue('spike', 'resources/spike.png');
		this.resources.addTextureInLoadQueue('rail', 'resources/rail.png');
		this.resources.addTextureInLoadQueue('hero', 'resources/hero.png');
		this.resources.addSoundInLoadQueue('nature', 'resources/nature.mp3');
		this.resources.addSoundInLoadQueue('theme', 'resources/theme.mp3');
		this.resources.addTextInLoadQueue('description', 'resources/html_fragments/description.html');
		this.resources.createTileMapSpriteSheet({
			id: 'tileset',
			path: 'resources/map.png',
			pixelsPerUnit: 16,
			tiles: [
				['3', new CORE.Rect(16, 48, 16, 16)],
				['1', new CORE.Rect(32, 48, 16, 16)],
				['2', new CORE.Rect(48, 48, 16, 16)],
				['01', new CORE.Rect(16, 64, 16, 16)],
				['00', new CORE.Rect(64, 64, 16, 16)],
				['ladders', new CORE.Rect(64, 48, 16, 16)],
				['littlebush', new CORE.Rect(0, 32, 32, 16)],
				['bush', new CORE.Rect(32, 16, 48, 32)],
				['littletree', new CORE.Rect(80, 0, 64, 80)],
				['tree', new CORE.Rect(144, 0, 70, 80)],
				['hero', new CORE.Rect(0, 80, 16, 32)],
				['walk', new CORE.Rect(16, 80, 16, 32)],
				['walk1', new CORE.Rect(32, 80, 16, 32)],
				['walk2', new CORE.Rect(48, 80, 16, 32)],
				['walk3', new CORE.Rect(64, 80, 16, 32)],
				['walk4', new CORE.Rect(80, 80, 16, 32)],
				['walk5', new CORE.Rect(96, 80, 16, 32)],
				['walk6', new CORE.Rect(112, 80, 16, 32)],
				['box1', new CORE.Rect(0, 48, 16, 16)],
				['box2', new CORE.Rect(0, 64, 16, 16)],
				['finish1', new CORE.Rect(128, 80, 76, 28)],
				['finish2', new CORE.Rect(128, 108, 76, 28)],
			],
		});
	}

	createCoin(position, layer = 2) {
		this.addObject(new CORE.GameObject({
			name: 'coin',
			isStatic: true,
			position: position,
			components: [
				new CORE.SpriteRenderer({
					sprite: new CORE.Sprite(this.resources.getTexture('coin')),
					layer,
				}),
				new CORE.CircleCollider(0.5),
			],
		}));
	}

	createInvisibleWall(position, scale) {
		this.addObject(new CORE.GameObject({
			name: 'invisibleWall',
			isStatic: true,
			scale: scale,
			position: position,
			components: [
				new CORE.BoxCollider(1, 300),
				new CORE.RigidBody({
					material: new CORE.Material(1, 0),
				}),
			],
		}));
	}

	createRailSpike(speed, position, size = 1, rotation = 0, isRandom = false) {
		let a = null;
		this.addObject(a = new CORE.GameObject({
			name: 'rail',
			position: position,
			rotation: rotation,
			scale: new CORE.Vector2d(size, 1),
			components: [
				new CORE.SpriteRenderer({
					sprite: new CORE.Sprite(this.resources.getTexture('rail')),
					layer: 2,
				}),
			],
		}));
		const min = -0.42;
		const max = 0.42;
		const left = a.transform.transformPoint(new CORE.Vector2d(min, -0.05));
		const right = a.transform.transformPoint(new CORE.Vector2d(max, -0.05));
		let spawn = null;
		if (isRandom) {
			spawn = a.transform.transformPoint(new CORE.Vector2d(min + Math.random() * (max - min), -0.05));
		} else {
			spawn = a.transform.transformPoint(new CORE.Vector2d(0, -0.05));
		}
		this.addObject(new CORE.GameObject({
			name: 'spike',
			scale: new CORE.Vector2d(2, 2),
			rotation: rotation,
			position: spawn,
			components: [
				new CORE.SpriteRenderer({
					sprite: new CORE.Sprite(this.resources.getTexture('spike')),
					layer: 2,
				}),
				new CORE.RigidBody({
					material: new CORE.Material(0.5, 0),
					isKinematic: true,
				}),
				new Mover(speed, left, right),
				new CORE.BoxCollider(0.31 / 2, 0.48),
			],
		}));
	}

	createBall(position) {
		for (let i = 0; i < 2; i++) {
			this.addObject(new CORE.GameObject({
				name: 'ball',
				position: new CORE.Vector2d(position.x + (i * 2), position.y),
				components: [
					new CORE.SpriteRenderer({
						sprite: new CORE.Sprite(this.resources.getTexture('ball')),
						layer: 3,
					}),
					new CORE.CircleCollider(0.5),
					new CORE.RigidBody({
						material: new CORE.Material(0.5, 0.5),
					}),
					new Rotater(3),
				],
			}));
		}
		this.addObject(new CORE.GameObject({
			name: 'ball',
			position: position.subtract(new CORE.Vector2d(2, 0)),
			components: [
				new CORE.SpriteRenderer({
					sprite: new CORE.Sprite(this.resources.getTexture('ball')),
					layer: 3,
				}),
				new CORE.CircleCollider(0.5),
				new CORE.RigidBody({
					material: new CORE.Material(0.1, 0.5),
				}),
				new Rotater(3),
			],
		}));
	}

	createLittleBush(x, y, layer = 0, scaleX = 1, scaleY = 1) {
		this.addObject(new CORE.GameObject({
			name: 'littlebushes',
			position: new CORE.Vector2d(x, y),
			isStatic: true,
			scale: new CORE.Vector2d(scaleX, scaleY),
			components: [
				new CORE.SpriteRenderer({
					layer,
					sprite: this.resources.getTiles('tileset').get('littlebush'),
				}),
			],
		}));
	}

	createBush(x, y, layer = 0) {
		this.addObject(new CORE.GameObject({
			name: 'bushes',
			position: new CORE.Vector2d(x, y),
			isStatic: true,
			components: [
				new CORE.SpriteRenderer({
					layer,
					sprite: this.resources.getTiles('tileset').get('bush'),
				}),
			],
		}));
	}

	createTree(x, y, layer = -2, scaleX = 1, scaleY = 1) {
		this.addObject(new CORE.GameObject({
			name: 'trees',
			position: new CORE.Vector2d(x, y),
			isStatic: true,
			scale: new CORE.Vector2d(scaleX, scaleY),
			components: [
				new CORE.SpriteRenderer({
					layer,
					sprite: this.resources.getTiles('tileset').get('tree'),
				}),
			],
		}));
	}

	createLittleTree(x, y, layer = -2) {
		this.addObject(new CORE.GameObject({
			name: 'littleTrees',
			position: new CORE.Vector2d(x, y),
			isStatic: true,
			components: [
				new CORE.SpriteRenderer({
					layer,
					sprite: this.resources.getTiles('tileset').get('littletree'),
				}),
			],
		}));
	}

	createStaticBox(x, y, layer = 1) {
		this.addObject(new CORE.GameObject({
			name: 'staticBox',
			position: new CORE.Vector2d(x, y),
			isStatic: true,
			components: [
				new CORE.SpriteRenderer({
					layer,
					sprite: this.resources.getTiles('tileset').get('box2'),
				}),
			],
		}));
	}

	createBox(x, y, layer = 1) {
		this.addObject(new CORE.GameObject({
			name: 'box',
			position: new CORE.Vector2d(x, y),
			components: [
				new CORE.SpriteRenderer({
					layer,
					sprite: this.resources.getTiles('tileset').get('box1'),
				}),
				new CORE.BoxCollider(1, 1),
				new CORE.RigidBody({
					material: new CORE.Material(0.5, 0),
					gravityScale: 5,
				}),
			],
		}));
	}

	onStart() {
		CORE.Screen.setSize(new CORE.Vector2d(1280, 720));
		this.createRailSpike(5, new CORE.Vector2d(15.4, -0.1), 4)
		this.createRailSpike(3, new CORE.Vector2d(20.4, -0.1), 5)
		const ss = this.resources.getTiles('tileset');
		this.finish = new CORE.GameObject({
			name: 'finish',
			position: new CORE.Vector2d(28.4, 1.2),
			components: [
				new CORE.SpriteRenderer({sprite: ss.get('finish1'), layer: -1}),
				new CORE.Animator([
					['finish', new CORE.Animation(0.09, true, [
						new CORE.SpriteKeyFrame(ss.get('finish1'), 0),
						new CORE.SpriteKeyFrame(ss.get('finish2'), 0.1)
					])],
					['idle', new CORE.Animation(1, false, [
						new CORE.SpriteKeyFrame(ss.get('finish1'), 0),
					])],
				], 'idle'),
			],
		});
		this.hero = new CORE.GameObject({
			name: 'hero',
			scale: new CORE.Vector2d(0.8, 0.8),
			position: new CORE.Vector2d(27, 0),
			components: [
				new CORE.SpriteRenderer({
					sprite: ss.get('hero'),
				}),
				new CORE.RigidBody({
					material: new CORE.Material(0.5, 0),
					gravityScale: 3,
				}),
				new CORE.Animator([
					['walk', new CORE.Animation(0.7, true, [
						new CORE.SpriteKeyFrame(ss.get('walk'), 0.1),
						new CORE.SpriteKeyFrame(ss.get('walk1'), 0.2),
						new CORE.SpriteKeyFrame(ss.get('walk2'), 0.3),
						new CORE.SpriteKeyFrame(ss.get('walk3'), 0.4),
						new CORE.SpriteKeyFrame(ss.get('walk4'), 0.5),
						new CORE.SpriteKeyFrame(ss.get('walk5'), 0.6),
						new CORE.SpriteKeyFrame(ss.get('walk6'), 0.7),
						
					])],
					['idle', new CORE.Animation(1, false, [
						new CORE.SpriteKeyFrame(ss.get('hero'), 0),
					])],
				], 'idle'),
				new CORE.BoxCollider(0.8, 2),
				new Controller(),
				new Collector(),
				new Player(5, new CORE.Vector2d(-3.5, 4)),
			],
		});
		this.addObject(new CORE.GameObject({
			name: 'sounds',
			components: [
				new CORE.AudioPlayer({
					volume: 0,
					loop: true,
					playbackRate: 1,
					sound: this.resources.getSound('nature'),
					isSpatialSound: false,
					playOnInitialize: true
				}),
				new CORE.AudioPlayer({
					volume: 0,
					loop: true,
					playbackRate: 1,
					sound: this.resources.getSound('theme'),
					isSpatialSound: false,
					playOnInitialize: true
				})
			],
		}));
		this.createBush(-40, -1);
		this.createBush(-40, 4.5, -1);
		this.createLittleBush(-38, 4, 8);
		this.createLittleTree(-37.5, 5.5);
		this.createLittleBush(-37, 4, -1);
		this.createLittleBush(-36, 3.5, -1);
		this.createBush(-34, -0.5);
		this.createLittleBush(-32, -1, 3);
		this.createTree(-32.8, 1.5);
		this.createBush(-23, -0.5);
		this.createBush(-23, 4.5)
		this.createLittleBush(-22.2, -1.1, 1, 0.8, 0.8);
		this.createTree(-21, 6, 2);
		this.createLittleBush(-20.5, 4, 2);
		this.createStaticBox(-20.2, 1);
		this.createBush(-18, 1.2);
		this.createLittleBush(-11, 2, 0, 1.25);
		this.createLittleBush(-5.2, -0.25, 2, 0.5,0.5);
		this.createTree(-5, 1.22, -2, 0.75, 0.75);
		this.createTree(11.5, 2);
		this.createTree(14.2, 1.5, 0, 0.75, 0.9);
		this.createTree(19, 1.75, -3, 0.8, 0.6);
		for (let i =0; i < 13; i += 3) {
			this.createBush(10.5 + i, 0.5);
		}
		for (let i = 0; i < 13; i += 3) {
			this.createLittleBush(9.5 + i, -0.1, 2);
		}
		for (let i = 0; i< 13; i += 5) {
			this.createLittleTree(11 + i, 1.5);
		}
		this.addObject(new CORE.GameObject({
			name: 'platform',
			isStatic: true,
			components: [
				new CORE.TileMap({
					spriteSheets: [ss],
					map: [
						['1', '2', '2', '2', '2', '2', '2', '3', null, null, null, null, null, null, null, null, null, null, '1', '2', '2', '2', '2', '2', '3'],
						['01', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
						['00', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '1', '2', '3'],
						['00', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '1', '2', '2', '2', '2', '3'],
						['00', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '1', '2', '2', '2', '2', '2', '2', '2', '2', '3', null, null, null, null, null, '1', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '3'],
						['2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '3', null, null, null, '1', '2', '2', '2', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', null, null, null, null, null, '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01', '01'  ],
						[null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, '01', '01', '01', '01' ]
					],
				}),
				new CORE.RigidBody({
					material: new CORE.Material(0.5, 0),
				}),
				new CORE.TileMapCollider()
			]
		}))
		this.addObject(new CORE.GameObject({
			name: 'background',
			isStatic: true,
			position: new CORE.Vector2d(-19, 0),
			components: [
				new CORE.TileMap({
					spriteSheets: [ss],
					layer: -1,
					map: [
						['01', '01', '01', '01', '01', '01', '01'],
						['00', '00', '00', '00', '00', '00', '00'],
						['00', '00', '00', '00'],
						['00', '00', '00', '01', '01', '01', '01', '01', '01'],
						['00', '00', '00', '00', '00', '00', '00', '00', '00'],
					],
				}),
			]
		}))

		this.addObject(new CORE.GameObject({
			name: 'ladders',
			position: new CORE.Vector2d(-23, 1.8),
			components: [
				new CORE.BoxCollider(0.2, 3.5),
			],
			children: [
				new CORE.GameObject({
					name: 'ladder-sprite',
					position: new CORE.Vector2d(1, -0.8),
					components: [
						new CORE.TileMap({
							color: new CORE.Color(240, 215, 175),
							spriteSheets: [ss],
							map: [
								['ladders'],
								['ladders'],
								['ladders'],
                            	['ladders'],
                            	['ladders']
							],
						}),
					]
				})
			]
		}));
		this.addObject(this.hero);
		this.createRailSpike(3.5, new CORE.Vector2d(-38, -1), 4);
		this.createRailSpike(2, new CORE.Vector2d(-41, 0.5), 4, Math.PI / 2);
		this.createRailSpike(3.5, new CORE.Vector2d(-38, 2), 4, Math.PI);
		this.createCoin(new CORE.Vector2d(-40.6, -0.8), -3);
		this.createCoin(new CORE.Vector2d(-18.6, 4.7));
		this.createCoin(new CORE.Vector2d(-11, 4));
		this.createCoin(new CORE.Vector2d(20.4, 0.7));
		this.createCoin(new CORE.Vector2d(15.9, 0.7));
		this.createBall(new CORE.Vector2d(-38.6, 4.4));
		this.createBox(0.4, 0.7);
		this.createBox(-1.6, 0.7);
		this.createBox(2.4, 0.7);
		this.addObject(this.finish);
		this.addObject(new CORE.Camera({
			name: 'camera',
			width: 1280,
			height: 720,
			zoom: 4,
			clearColor: new CORE.Color(156, 180, 219),
			components: [
				new Follower(this.hero),
			],
		}));
		const ui = new CORE.UIObject({id: 'ui', tag: 'div'});
		this.addObject(ui);
		ui.addChild(new CORE.UIObject({
			tag: 'div',
			id: 'countsContainer',
			children: [
				new CORE.UIObject({
					tag: 'div',
					id: 'lifeContainer',
					children: [
						new CORE.UIObject({
							tag: 'div',
							id: 'lifeText',
							innerText: 'Жизни:',
						}),
						new CORE.UIObject({
							tag: 'div',
							id: 'life',
							components: [
								new UILifeCount(this.hero),
							],
						}),
					],
				}),
				new CORE.UIObject({
					tag: 'div',
					id: 'coinsContainer',
					children: [
						new CORE.UIObject({
							tag: 'div',
							id: 'coinsText',
							innerText: 'Монетки:',
						}),
						new CORE.UIObject({
							tag: 'div',
							id: 'coins',
							components: [
								new UICoinsCount(this.hero),
							],
						}),
					],
				}),
			],
		}));
		ui.addChild(new CORE.UIObject({
			tag: 'button',
			id: 'closeButton',
			innerText: 'Меню',
		}));
		ui.addChild(new CORE.UIObject({
			tag: 'div',
			id: 'openMenu',
			children: [
				new CORE.UIObject({
					tag: 'div',
					id: 'about',
					innerHTML: this.resources.getText('description'),
				}),
				new CORE.UIObject({
					tag: 'div',
					id: 'audio',
					children: [
						new CORE.UIObject({
							name: 'volume',
							tag: 'input',
							attributes: [
								{name: 'type', value: 'range'},
								{name: 'min', value: '0'},
								{name: 'max', value: '100'},
								{name: 'step', value: '1'},
								{name: 'value', value: '50'},
							],
						}),
					],
				}),
				new CORE.UIObject({
					tag: 'ul',
					id: 'navbar',
					children: [
						new CORE.UIObject({
							tag: 'li',
							name: 'liAbout',
							children: [
								new CORE.UIObject({
									tag: 'button',
									name: 'about',
									innerText: 'Об игре',
								}),	
							],
						}),
						new CORE.UIObject({
							tag: 'li',
							name: 'liAudio',
							children: [
								new CORE.UIObject({
									tag: 'button',
									name: 'audio',
									innerText: 'Звук',
								}),
							],
						}),
						new CORE.UIObject({
							tag: 'li',
							name: 'liClose',
							children: [
								new CORE.UIObject({
									tag: 'button',
									innerText: 'Закрыть',
									id: 'closeMenu',
								}),
							],
						}),
					],
				}),
			],
		}));
	}
}
