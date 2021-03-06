import Component from './Component.js';
import Scene from './Scene.js';

export default class ComponentObject {
	/**
	 * @param {boolean} isEnabled Включен ли объект.
	 */
	constructor(isEnabled) {
		if (new.target === ComponentObject) {
			throw new TypeError('cannot create instance of abstract class.');
		}
		this.isInitialized = false;
		this.isDestroyed = false;
		this.isEnabled = isEnabled;

		/**
		 * @type {Component[]}
		 * 
		 * @access private
		 */
		this.components = [];
		/**
		 * @access private
		 */
		this.componentsInProcessing = false;
		/**
		 * @access private
		 */
		this.componentRemovedInProcessing = false;
	}

	/**
	 * Инициализирует данный объект.
	 */
	initialize() {
		this.throwIfDestroyed();
		if (this.isInitialized || !this.isActive()) {
			return;
		}
		this.isInitialized = true;
		this.scene.disabledObjects.delete(this);
		this.scene.enabledObjects.delete(this);
		this.scene.objectsBuffer.add(this);
		this.forEachComponent(component => component.initialize());
	}

	/**
	 * Влючает или выключает объект.
	 * 
	 * @param {boolean} value Должен ли объект включиться.
	 */
	setEnabled(value) {
		this.throwIfDestroyed();
		if (typeof value !== 'boolean') {
			throw new TypeError('invalid parameter "value". Expected a boolean value.');
		}
		if (value === this.isEnabled) {
			return;
		}
		this.isEnabled = value;
		if (value) {
			this.enable();
		} else {
			this.disable();
		}
	}

	/**
	 * Служебная функция. Для включения и выключения объекта использовать setEnabled(value).
	 * 
	 * @access protected
	 */
	enable() {
		this.throwIfDestroyed();
		if (this.scene == null) {
			return;
		}
		this.scene.disabledObjects.delete(this);
		this.scene.enabledObjects.delete(this);
		this.scene.objectsBuffer.add(this);
		if (!this.isInitialized) {
			this.initialize();
			return;
		}
		this.forEachComponent(component => {
			if (!component.isActive()) {
				return;
			}
			if (!component.isInitialized) {
				component.initialize();
			} else {
				component.onEnable();
			}
		});
	}

	/**
	 * Служебная функция. Для включения и выключения объекта использовать setEnabled(value).
	 * 
	 * @access protected
	 */
	disable() {
		this.throwIfDestroyed();
		if (this.scene != null) {
			this.scene.disabledObjects.delete(this);
			this.scene.enabledObjects.delete(this);
			this.scene.objectsBuffer.add(this);
		}
		if (!this.isInitialized) {
			return;
		}
		const isMainProcess = !this.componentsInProcessing;
		this.componentsInProcessing = true;

		this.components.forEach(component => {
			if (this.isDestroyed || this.isActive()) {
				return;
			}
			if (component.isDestroyed) {
				this.componentRemovedInProcessing = true;
				return;
			}
			if (component.isEnabled && component.isInitialized) {
				component.onDisable();
			}
		});

		if (this.isDestroyed) {
			return;
		}

		if (isMainProcess) {
			this.componentsInProcessing = false;
			this.removeDestroyedComponents();
		}
	}

	/**
	 * Выбрасывает ошибку, если объект уничтожен.
	 */
	throwIfDestroyed() {
		if (this.isDestroyed) {
			throw new Error('component object is destroyed.');
		}
	}

	/**
	 * Выбрасывает ошибку, если объект еше не инициализирован.
	 */
	throwIfNotInitialized() {
		if (!this.isInitialized) {
			throw new Error('component object is not initialized.');
		}
	}

	/**
	 * Добавляет компонент к объекту.
	 * 
	 * @param {Component} component Компонент, который надо добавить.
	 */
	addComponent(component) {
		this.throwIfDestroyed();
		if (!(component instanceof Component)) {
			throw new TypeError('invalid parameter "component". Expected an instance of Component class.');
		}
		if (this.components.includes(component)) {
			return;
		}
		if (!component.allowMultipleComponents()) {
			const componentConstructor = Object.getPrototypeOf(component).constructor;
			if (this.getComponent(componentConstructor) != null) {
				const message = `adding multiple instances of "${componentConstructor.name}" component is disallowed.`;
				throw new Error(message);
			}
		}
		component.attach(this);
		this.components.push(component);
		if (this.isInitialized) {
			component.initialize();
		}
	}

	/**
	 * @param {function} componentClass Класс компонента, который надо получить.
	 * 
	 * @return {Component} Возвращает первый компонент, который принадлежит передаваемому классу. Если такого нет, то возвращается undefined.
	 */
	getComponent(componentClass) {
		this.throwIfDestroyed();
		if (typeof componentClass !== 'function') {
			throw new TypeError('invalid parameter "componentClass". Expected a function.');
		}
		return this.components.find(component => !component.isDestroyed && component instanceof componentClass);
	}

	/**
	 * @param {function} componentsClass Класс компонентов, которые надо получить.
	 * 
	 * @return {Component[]} Возвращает массив компонентов, которые принадлежат передаваемому классу. Если таких нет, то возвращается пустой массив.
	 */
	getComponents(componentsClass) {
		this.throwIfDestroyed();
		if (typeof componentsClass !== 'function') {
			throw new TypeError('invalid parameter "componentsClass". Expected a function.');
		}
		return this.components.filter(component => !component.isDestroyed && component instanceof componentsClass);
	}

	/**
	 * @return {number} Возвращает количество компонентов на данном объекте.
	 */
	getComponentsCount() {
		this.throwIfDestroyed();
		return this.components.reduce((accumulator, component) => {
			if (!component.isDestroyed) {
				accumulator++;
			}
			return accumulator;
		}, 0);
	}

	/**
	 * Удаляет первый компонент, который принадлежит передаваемому классу, из данного объекта.
	 * 
	 * @param {function} componentClass Класс компонента, который надо удалить.
	 */
	removeComponentByClass(componentClass) {
		if (this.isDestroyed) {
			return;
		}
		if (typeof componentClass !== 'function') {
			throw new TypeError('invalid parameter "componentClass". Expected a function.');
		}
		const index = this.components.findIndex(component => component instanceof componentClass);
		if (index >= 0) {
			this.removeComponentAt(index);
		}
	}

	/**
	 * Удаляет компоненты, которые принадлежат передаваемому классу, из данного объекта.
	 * 
	 * @param {function} componentsClass Класс компонентов, которые надо удалить.
	 */
	removeComponentsByClass(componentsClass) {
		if (this.isDestroyed) {
			return;
		}
		if (typeof componentsClass !== 'function') {
			throw new TypeError('invalid parameter "componentsClass". Expected a function.');
		}
		if (this.componentsInProcessing) {
			this.components.forEach(component => {
				if (!component.isDestroyed && component instanceof componentsClass) {
					component.destroy();
				}
			});
		} else {
			this.components = this.components.filter(component => {
				if (!component.isDestroyed && component instanceof componentsClass) {
					component.destroy();
					return false;
				}
				return true;
			});
		}
	}

	/**
	 * Удаляет компонент из данного объекта.
	 * 
	 * @param {Component} component Компонент, который надо удалить.
	 */
	removeComponent(component) {
		if (this.isDestroyed) {
			return;
		}
		if (!(component instanceof Component)) {
			throw new TypeError('invalid parameter "component". Expected an instance of Component class.');
		}
		const index = this.components.indexOf(component);
		if (index >= 0) {
			this.removeComponentAt(index);
		}
	}

	/**
	 * Удаляет компонент из данного объекта по индексу.
	 * 
	 * @param {number} index Индекс компонента, который нужно удалить.
	 */
	removeComponentAt(index) {
		if (this.isDestroyed) {
			return;
		}
		if (!Number.isInteger(index)) {
			throw new TypeError('invalid parameter "index". Expected a integer.');
		}
		if (index < 0 || index >= this.components.length) {
			throw new RangeError('invalid parametr "index".');
		}
		if (!this.components[index].isDestroyed) {
			this.components[index].destroy();
		}
		if (!this.componentsInProcessing) {
			this.components.splice(index, 1);
		}
	}

	/**
	 * Удаляет компоненты, которые были уничтожены во время обработки всех компонентов.
	 * 
	 * Если вызов функции произойдет, когда компоненты еще обрабатываются, то удаления уничтоженных компонентов не будет выполнено.
	 * Однако этот вызов скажет объекту, что во время обработки компонентов было удаление.
	 */
	removeDestroyedComponents() {
		if (this.isDestroyed) {
			return;
		}
		if (this.componentsInProcessing) {
			this.componentRemovedInProcessing = true;
		} else if (this.componentRemovedInProcessing) {
			this.components = this.components.filter(component => !component.isDestroyed);
			this.componentRemovedInProcessing = false;
		}
	}

	/**
	 * Вызывает функцию во всех компонентах данного объекта с помощью класса Reflect.
	 * 
	 * @param {string} functionName Название функции, которую надо вызвать.
	 * @param {...any} args         Агрументы, которые надо передать в функцию.
	 */
	callInComponents(functionName, ...args) {
		this.throwIfDestroyed();
		this.forEachComponent(component => {
			if (!component.isEnabled) {
				return;
			}
			const componentFunction = component[functionName];
			if (componentFunction != null && typeof componentFunction === 'function') {
				Reflect.apply(componentFunction, component, args);
			}
		});
	}

	/**
	 * @return {boolean} Возвращает true, если объект не уничтожен и включен.
	 */
	isActive() {
		return !this.isDestroyed && this.isEnabled;
	}

	/**
	 * Выполняет функцию для всех компонентов.
	 * 
	 * @param {(component: Component) => void} action Фукнкция, котороя выполнится для каждого компонента.
	 */
	forEachComponent(action) {
		this.throwIfDestroyed();
		const isMainProcess = !this.componentsInProcessing;
		this.componentsInProcessing = true;

		this.components.forEach(component => {
			if (!this.isActive()) {
				return;
			}
			if (component.isDestroyed) {
				this.componentRemovedInProcessing = true;
				return;
			}
			action(component);
		});

		if (this.isDestroyed) {
			return;
		}

		if (isMainProcess) {
			this.componentsInProcessing = false;
			this.removeDestroyedComponents();
		}
	}

	/**
	 * Обновляет все компоненты в данном объекте.
	 * 
	 * @param {number} deltaTime Время, которое прошло с прошлого кадра в секундах.
	 */
	update(deltaTime) {
		this.throwIfDestroyed();
		this.throwIfNotInitialized();
		this.forEachComponent(component => {
			if (component.isEnabled) {
				component.onUpdate(deltaTime);
			}
		});
	}

	/**
	 * Уничтожает данный объект.
	 */
	destroy() {
		if (this.isDestroyed) {
			return;
		}
		this.components.forEach(component => !component.isDestroyed && component.destroy());
		delete this.components;
		this.isDestroyed = true;
		if (this.scene != null) {
			this.scene.removeObject(this);
			this.scene = null;
		}
	}

	/**
	 * Привязывает данный объект к сцене.
	 * 
	 * @param {Scene} scene Сцена, к которой привяжется объект.
	 */
	attach(scene) {
		if (!(scene instanceof Scene)) {
			throw new TypeError('invalid parameter "scene". Expected an instance of Scene class.');
		}
		if (this.scene != null) {
			throw new Error('component object already attached to scene.');
		}
		this.scene = scene;
	}
}
