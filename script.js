'use strict';

let map, mapEvent;

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    click = 0;

    constructor(coords, distance, duration){
        this.coords = coords;       //[lat,lng]
        this.distance = distance;   //in km
        this.duration = duration;   //in min
        
    }

    _setDescription(){
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    clicks(){
        this.click++;
    }
}

class Running extends Workout{
    type = 'running';
    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        //min per km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout{
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        //km per h
        this.speed = this.distance / (this.duration/60);
        return this.speed;
    }
}


// const run1 = new Running([139,-12], 5.2, 24, 178 );
// const cycling1 = new Cycling([139,-12], 27, 85, 523 );
// console.log(run1, cycling1);


//////////////////////////////////////////////////////////////

//Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    #map;       //private instance properties/field
    #mapZoomLevel = 13;
    #mapEvent;  //private instance properties/field
    #workouts = [];

    constructor() {
        //Get user's position
        this._getPosition();     //calling method

        //Get data from local storage
        this._getLocalStorage();

        //Attach event handlers
        form.addEventListener('submit',this._newWorkout.bind(this));  //To have a event listner on submitting form
        inputType.addEventListener('change',this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }
        
    _getPosition() {
        //Geolocation api to locate longitude and latitude
        if(navigator.geolocation)
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(){
                alert('Could not get your position');
        })
    }

    _loadMap(position) {
            //console.log(position);
            const {latitude} = position.coords;
            const {longitude} = position.coords;
            //console.log(latitude,longitude);
            //console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
            
            const coords = [latitude,longitude];

            //Using lib Leaflet to display map in UI
            this.#map = L.map('map').setView(coords, this.#mapZoomLevel);   //html element with ID app(13 is the zoom level)
            //console.log(map); //object 

            L.tileLayer('https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);

            //Handling clicks on map
            this.#map.on('click',this._showForm.bind(this)) //instead of using event listner, we are using Leaflet method map.on            
            
            //render historical workouts on map
            this.#workouts.forEach(work => {
                this._renderWorkoutMarker(work);
            });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;    //we are copying mapE to global varible, so we can outside the scope
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        //Empty the inputs
        inputDistance.value = inputDuration.value = inputCadence.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000)
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden')     //closest methods select parent element
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden')     //closest methods select parent element
    }

    _newWorkout(e) {

        //helper functions
        const validInputs = (...inputs) => 
            inputs.every(inp => Number.isFinite(inp)); //loop over every element of an array and check if input is number or not
        
        const allPositive = (...inputs) => inputs.every(inp => inp>0); //to validate if input is positive 

        e.preventDefault();

        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value; //convert str to number
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;  //customizable popup
        let workout;

        //If workout running, create running object
        if(type === 'running') {
            //Check if data is valid
            const cadence = +inputCadence.value;
            if(!validInputs(distance, duration, cadence) || 
               !allPositive(distance,duration,cadence)
               )
            return alert('Inputs have to be a positive numbers!')

            workout = new Running([lat, lng], distance, duration, cadence);

        }

        //If activity cycling, create cycling object
        if(type === 'cycling') {
            const elevation = +inputElevation.value;
            //Check if data is valid
            if(!validInputs(distance, duration, elevation)|| 
               !allPositive(distance,duration)
               )
            return alert('Inputs have to be a positive numbers!');

            workout = new Cycling([lat, lng], distance, duration, elevation);

        }

        //Add new object to workout array
        this.#workouts.push(workout);
        console.log(workout);

        //Render workout on a map as marker
        this._renderWorkoutMarker(workout);

        //Render workout on the list
        this._renderWorkout(workout);

        //Hide form + clearing input fields
        this._hideForm();

        //Set local storage to all workouts
        this._setLocalStorage();
    }
    
    _renderWorkoutMarker(workout){
        //console.log(this.#mapEvent);  //Display marker

        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`  //CSS class for running
        })
        )  
        .setPopupContent(`${workout.type ==='running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup();
    }

    _renderWorkout(workout) {

        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type ==='running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;
        if(workout.type === 'running')
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;

        if(workout.type === 'cycling')
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        //console.log(workoutEl);

        if(!workoutEl) return;
        
        //getting workout data from workout array
        const workout = this.#workouts.find(
            work => work.id === workoutEl.dataset.id
        );
        //console.log(workout);
        
        //Refer leaflet doc for more info on this prop.
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

        //using the public interface
        //workout.clicks();
    }

    //browser provides local storage api
    _setLocalStorage() {
       //json.stringify for converting obj to str/json 
        localStorage.setItem('workouts',JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        //json.parse for converting str to obj
        const data = JSON.parse(localStorage.getItem('workouts'));
        //console.log(data);

        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        })
    }

    //To reset page (public method/interface)
    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();   //need to create object of above blueprint

