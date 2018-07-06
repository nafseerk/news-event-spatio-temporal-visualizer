import random
import csv
from faker import Faker
from datetime import datetime, tzinfo, timedelta


# A UTC class
class UTC(tzinfo):
    """UTC"""

    def utcoffset(self, dt):
        return timedelta(0)

    def tzname(self, dt):
        return "UTC"

    def dst(self, dt):
        return timedelta(0)

def generate_random_data(out_file_name, start_date, end_date, num_rows):

    # Fake data generator
    fake = Faker()

    with open(out_file_name, 'w+', newline='') as csvfile:

        writer = csv.writer(csvfile, delimiter=',')

        # Write column headers
        writer.writerow(['tweet_id', 'score', 'lat', 'lng', 'timestamp'])

        for i in range(1, num_rows+1):
            row = []

            # Add tweet_id
            row.append(i)

            # Add score
            row.append(random.randint(-1,1))

            # Add latitude
            row.append(float(fake.latitude()))

            # Add longitude
            row.append(float(fake.longitude()))

            # Add timestamp
            fake_date_time = fake.date_time_between_dates(datetime_start=start_date,
                                                          datetime_end=end_date,
                                                          tzinfo=UTC())
            fake_timestamp = int(fake_date_time.timestamp())
            row.append(fake_timestamp)

            writer.writerow(row)


if __name__ == '__main__':

    output_file = '/Users/apple/Desktop/test/sentiment-spatio-temporal-visualizer/csv/test_data_set.csv'
    data_set_size = 10000
    start_date = datetime.strptime("01/10/2008, 00:00 UTC", "%d/%m/%Y, %H:%M %Z")
    end_date = datetime.strptime("28/10/2008, 23:59 UTC", "%d/%m/%Y, %H:%M %Z")

    generate_random_data(output_file, start_date, end_date, data_set_size)
