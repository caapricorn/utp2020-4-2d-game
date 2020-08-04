import Renderer from './Renderer.js';
import Sprite from './Sprite.js';
import Vector2d from '../Vector2d.js';

export default class SpriteRenderer extends Renderer {
	/**
	 * @param {Sprite} sprite Спрайт, который будет отрисовываться каждый кадр.
	 */
	constructor(sprite) {
		super();
		this.setSprite(sprite);
	}

	/**
	 * Изменяет спрайт.
	 * 
	 * @param {Sprite} sprite Спрайт, который будет отрисовываться каждый кадр.
	 */
	setSprite(sprite) {
		if (!(sprite instanceof Sprite)) {
			throw new TypeError('invalid parameter "sprite". Expected an instance of Sprite class.');
		}
		this.sprite = sprite;
	}
	
	/**
	 * Отрисовывает спрайт.
	 * 
	 * @param {CanvasRenderingContext2D} context Контекст, в котором будет происходить отрисовка.
	 */
	draw(context) {
		let position = this.transform.position;
		const region = this.sprite.region;
		const scale = this.transform.scale;
		const rotation = this.transform.rotation;

		const canvas = context.canvas;
		position = new Vector2d(position.x, -position.y);
		position = position.multiply(100);
		position = position.add(new Vector2d(canvas.clientWidth / 2, canvas.clientHeight / 2));
	
		context.save();
		context.translate(position.x, position.y);
		context.rotate(rotation);
		context.scale(scale.x, scale.y);
		context.drawImage(
			this.sprite.image,
			region.x,
			region.y,
			region.width,
			region.height,
			-region.width / 2,
			-region.height / 2,
			region.width,
			region.height,
		);
		context.restore();
	}
}
